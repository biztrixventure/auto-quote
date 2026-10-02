import { db } from "../db";
import { audit } from "../audit";
import { getRater } from "./rater";
import { getDistributor } from "./distribution";
import type { RaterQuote } from "./types";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}

/**
 * The core business rule:
 * 1. Try to get real quotes from partner carriers (agency revenue).
 * 2. If none, sell the lead through the distribution platform (lead revenue).
 * 3. If that fails too, flag it for an agent to follow up.
 */
export async function routeLead(leadId: string) {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { drivers: true, vehicles: true },
  });
  if (!lead) throw new Error("Lead not found");

  const rater = getRater();
  let quotes: RaterQuote[] = [];
  try {
    quotes = await withTimeout(rater.getQuotes(lead), Number(process.env.RATER_TIMEOUT_MS || 8000));
  } catch (err) {
    await audit("system", "rater_error", "lead", lead.id, { rater: rater.name, error: String(err) });
  }

  if (quotes.length > 0) {
    await db.$transaction([
      db.quote.createMany({
        data: quotes.map((q) => ({ ...q, leadId: lead.id, source: rater.name })),
      }),
      db.lead.update({ where: { id: lead.id }, data: { status: "quoted", routedTo: `rater:${rater.name}` } }),
    ]);
    await audit("system", "quoted", "lead", lead.id, { rater: rater.name, count: quotes.length });
    return { outcome: "quoted" as const };
  }

  // Do-not-contact and do-not-sell (opted out of sale/sharing) leads are never sold.
  const distributor = lead.doNotContact || lead.doNotSell ? null : await getDistributor();
  if (distributor) {
    try {
      const result = await distributor.postLead(lead);
      await db.leadSale.create({
        data: {
          leadId: lead.id,
          distributor: distributor.name,
          buyer: result.buyer,
          price: result.price,
          accepted: result.accepted,
          responseRaw: JSON.stringify(result.raw ?? null).slice(0, 4000),
        },
      });
      if (result.accepted) {
        await db.lead.update({
          where: { id: lead.id },
          data: { status: "sold_lead", routedTo: `distributor:${distributor.name}`, leadRevenue: result.price ?? null },
        });
        await audit("system", "lead_sold", "lead", lead.id, { buyer: result.buyer, price: result.price });
        return { outcome: "sold_lead" as const };
      }
    } catch (err) {
      await audit("system", "distribution_error", "lead", lead.id, { error: String(err) });
    }
  }

  await db.lead.update({ where: { id: lead.id }, data: { status: "agent_followup" } });
  await audit("system", "agent_followup", "lead", lead.id);
  return { outcome: "agent_followup" as const };
}
