import { db } from "../db";
import { ageFromDob, priceQuotes } from "../pricing";
import { getSettings } from "../settings";
import type { LeadWithRisk, RaterAdapter, RaterQuote } from "./types";

/**
 * Partner rater. Prices come from the rules in /admin/pricing and the partners in
 * /admin/partners, so each visitor only sees partners that fit their answers.
 * These are estimates set by the agency, not live carrier quotes.
 */
class PartnerRater implements RaterAdapter {
  name = "partners";

  async getQuotes(lead: LeadWithRisk): Promise<RaterQuote[]> {
    const d = lead.drivers.find((x) => x.isPrimary) ?? lead.drivers[0];
    const v = lead.vehicles[0];
    if (!d || !v) return [];

    const [{ pricing }, partners] = await Promise.all([
      getSettings(),
      db.partner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    const quotes = priceQuotes(pricing, partners, {
      state: lead.state,
      coverageLevel: lead.coverageLevel,
      currentlyInsured: lead.currentlyInsured,
      age: ageFromDob(d.dateOfBirth),
      accidents: d.accidents,
      violations: d.violations,
      licenseStatus: d.licenseStatus,
      vehicleYear: v.year,
    });
    return quotes.map((q) => ({
      carrier: q.partner.name,
      monthlyPremium: q.monthly,
      termPremium: q.term,
      termMonths: q.termMonths,
      coverageSummary: q.coverageSummary,
      bindUrl: q.partner.bindUrl ?? undefined,
      carrierReference: q.partner.id,
    }));
  }
}

/**
 * EZLynx adapter (to implement).
 * Get the API documentation and credentials from EZLynx through the agency's account.
 * Steps: map LeadWithRisk → EZLynx applicant format, submit for rating,
 * poll/receive results, map each carrier result → RaterQuote.
 */
class EzlynxRater implements RaterAdapter {
  name = "ezlynx";
  async getQuotes(_lead: LeadWithRisk): Promise<RaterQuote[]> {
    throw new Error("EZLynx adapter not implemented yet. See src/lib/integrations/rater.ts");
  }
}

/**
 * TurboRater (Zywave) adapter (to implement).
 * Use the Personal Lines Quoting API documentation provided to the agency.
 */
class TurboRater implements RaterAdapter {
  name = "turborater";
  async getQuotes(_lead: LeadWithRisk): Promise<RaterQuote[]> {
    throw new Error("TurboRater adapter not implemented yet. See src/lib/integrations/rater.ts");
  }
}

export function getRater(): RaterAdapter {
  switch (process.env.RATER_PROVIDER) {
    case "ezlynx":
      return new EzlynxRater();
    case "turborater":
      return new TurboRater();
    default: // "demo" or "partners"
      return new PartnerRater();
  }
}
