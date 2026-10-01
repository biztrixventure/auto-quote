import type { Partner } from "@prisma/client";
import type { PricingRules } from "./settings";

export type Coverage = "state_minimum" | "standard" | "premium";

export type RiskProfile = {
  state: string;
  coverageLevel: string;
  currentlyInsured: boolean;
  age: number;
  accidents: number;
  violations: number;
  licenseStatus: string;
  vehicleYear: number;
};

export type PriceQuote = { partner: Partner; monthly: number; term: number; termMonths: number; coverageSummary: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
export const list = (csv: string) => csv.split(",").map((s) => s.trim()).filter(Boolean);

/** Monthly price before the partner's own factor, or null when the driver gets no online quotes. */
export function basePrice(rules: PricingRules, p: RiskProfile): number | null {
  if (rules.declineSuspended && p.licenseStatus === "suspended") return null;
  if (rules.declineAtIncidents > 0 && p.accidents + p.violations >= rules.declineAtIncidents) return null;
  const coverage = (p.coverageLevel in rules.coveragePercent ? p.coverageLevel : "standard") as Coverage;
  let price = rules.basePrice;
  if (p.age < 25) price += rules.ageUnder25;
  else if (p.age > 65) price += rules.age65Plus;
  price += p.accidents * rules.perAccident + p.violations * rules.perViolation;
  price *= 1 + rules.coveragePercent[coverage] / 100;
  if (!p.currentlyInsured) price *= 1 + rules.uninsuredPercent / 100;
  if (p.vehicleYear >= new Date().getFullYear() - 3) price *= 1 + rules.newVehiclePercent / 100;
  return price;
}

/** Why a partner would not quote this driver, or null when it would. */
export function ineligibleReason(partner: Partner, p: RiskProfile): string | null {
  if (!partner.active) return "inactive";
  const states = list(partner.states);
  if (states.length && !states.includes(p.state)) return `not in ${p.state}`;
  if (!list(partner.coverageLevels).includes(p.coverageLevel)) return "coverage level not offered";
  if (partner.minAge !== null && p.age < partner.minAge) return `under ${partner.minAge}`;
  if (partner.maxAge !== null && p.age > partner.maxAge) return `over ${partner.maxAge}`;
  if (partner.maxAccidents !== null && p.accidents > partner.maxAccidents) return "too many accidents";
  if (partner.maxViolations !== null && p.violations > partner.maxViolations) return "too many violations";
  if (!partner.acceptsUninsured && !p.currentlyInsured) return "requires current insurance";
  return null;
}

/** Quotes a driver would see: eligible partners, cheapest first, capped at maxQuotes. */
export function priceQuotes(rules: PricingRules, partners: Partner[], p: RiskProfile): PriceQuote[] {
  const base = basePrice(rules, p);
  if (base === null) return [];
  const coverage = (p.coverageLevel in rules.coverageSummary ? p.coverageLevel : "standard") as Coverage;
  return partners
    .filter((partner) => ineligibleReason(partner, p) === null)
    .map((partner) => {
      const monthly = round2(base * partner.priceFactor);
      return { partner, monthly, term: round2(monthly * rules.termMonths), termMonths: rules.termMonths, coverageSummary: rules.coverageSummary[coverage] };
    })
    .sort((a, b) => a.monthly - b.monthly || a.partner.sortOrder - b.partner.sortOrder)
    .slice(0, Math.max(1, rules.maxQuotes));
}

export function ageFromDob(dob: string) {
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 35;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}
