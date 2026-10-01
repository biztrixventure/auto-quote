import type { LeadBuyer } from "@prisma/client";
import { db } from "../db";
import { postJson } from "../outbound";
import { list } from "../pricing";
import type { DistributionResult, LeadDistributor, LeadWithRisk } from "./types";

/** DEMO distributor: pretends a buyer accepted the lead. */
class DemoDistributor implements LeadDistributor {
  name = "demo";
  async postLead(lead: LeadWithRisk): Promise<DistributionResult> {
    const d = lead.drivers[0];
    const price = d && d.licenseStatus === "suspended" ? 0 : 18.5;
    return { accepted: price > 0, buyer: price > 0 ? "Demo Buyer" : undefined, price, raw: { demo: true } };
  }
}

/**
 * The lead as sent to buyers. Lead distribution platforms (LeadsPedia, LeadProsper,
 * boberdoo, Phonexa…) each give you a posting spec: adjust this and parseResponse() to match it.
 */
export function mapLead(lead: LeadWithRisk) {
  const d = lead.drivers[0];
  const v = lead.vehicles[0];
  return {
    lead_id: lead.id,
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zip: lead.zip,
    ip_address: lead.ipAddress,
    user_agent: lead.userAgent,
    trusted_form_cert_url: lead.trustedFormCertUrl,
    currently_insured: lead.currentlyInsured,
    current_carrier: lead.currentCarrier,
    coverage_level: lead.coverageLevel,
    driver: d && {
      dob: d.dateOfBirth,
      gender: d.gender,
      marital_status: d.maritalStatus,
      license_status: d.licenseStatus,
      accidents: d.accidents,
      violations: d.violations,
    },
    vehicle: v && {
      year: v.year,
      make: v.make,
      model: v.model,
      ownership: v.ownership,
      primary_use: v.primaryUse,
      annual_miles: v.annualMiles,
    },
    source: lead.utmSource,
    campaign: lead.utmCampaign,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseResponse(json: any): DistributionResult {
  const accepted = Boolean(json?.accepted ?? json?.success ?? json?.status === "accepted");
  return {
    accepted,
    buyer: json?.buyer ?? json?.buyer_name,
    price: typeof json?.price === "number" ? json.price : Number(json?.payout) || undefined,
    raw: json,
  };
}

/** Posts a lead (or any JSON) to one buyer address and reads its answer. */
export async function postToBuyer(url: string, body: unknown, authHeader?: string | null): Promise<DistributionResult> {
  const res = await postJson(url, body, authHeader ? { Authorization: authHeader } : {});
  const text = (await res.text()).slice(0, 20000);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 2000) };
  }
  if (!res.ok) return { accepted: false, raw: { status: res.status, body: json } };
  return parseResponse(json);
}

/** Generic webhook distributor configured in .env (LEAD_POST_URL / LEAD_POST_API_KEY). */
class WebhookDistributor implements LeadDistributor {
  name = "webhook";
  async postLead(lead: LeadWithRisk): Promise<DistributionResult> {
    const url = process.env.LEAD_POST_URL;
    if (!url) throw new Error("LEAD_POST_URL is not set");
    return postToBuyer(url, mapLead(lead), process.env.LEAD_POST_API_KEY ? `Bearer ${process.env.LEAD_POST_API_KEY}` : null);
  }
}

/**
 * Buyers managed in /admin/buyers. Tried in order; the first one that buys the lead's
 * state and accepts at or above its minimum price wins.
 */
class BuyersDistributor implements LeadDistributor {
  name = "buyers";
  constructor(private buyers: LeadBuyer[]) {}

  async postLead(lead: LeadWithRisk): Promise<DistributionResult> {
    const attempts: { buyer: string; result: string }[] = [];
    for (const buyer of this.buyers) {
      const states = list(buyer.states);
      if (states.length && !states.includes(lead.state)) continue;
      try {
        const r = await postToBuyer(buyer.webhookUrl, mapLead(lead), buyer.authHeader);
        const priceOk = buyer.minPrice === null || (r.price ?? 0) >= buyer.minPrice;
        attempts.push({ buyer: buyer.name, result: r.accepted ? (priceOk ? `accepted ${r.price ?? ""}` : `below minimum (${r.price ?? 0})`) : "rejected" });
        if (r.accepted && priceOk) return { ...r, buyer: r.buyer ?? buyer.name, raw: { attempts, response: r.raw } };
      } catch (err) {
        attempts.push({ buyer: buyer.name, result: `error: ${String(err).slice(0, 120)}` });
      }
    }
    return { accepted: false, raw: { attempts } };
  }
}

export async function getDistributor(): Promise<LeadDistributor | null> {
  if (process.env.LEAD_DISTRIBUTION === "off") return null;
  const buyers = await db.leadBuyer.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  if (buyers.length) return new BuyersDistributor(buyers);
  if (process.env.LEAD_DISTRIBUTION === "webhook") return new WebhookDistributor();
  return new DemoDistributor();
}
