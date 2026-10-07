// Estimated monthly prices for the three vehicle service contract plan levels, shown at the end of
// the quote form. These are estimates for a typical payment plan, not offers: the final price comes
// from the provider and depends on the exact car, its condition, the term and the deductible.
//
// Market reference: ConsumerAffairs (2026) puts typical annual costs at about $600–$750 for powertrain
// plans and $1,000–$1,500 for mid-level plans. The base prices below are monthly for an average car
// (4–7 years old, 50,000–75,000 miles). Change them to match your providers' real rate cards.

export type PlanKey = "powertrain" | "plus" | "complete";

export const PLANS: { key: PlanKey; name: string; tagline: string; base: number; includes: string[] }[] = [
  {
    key: "powertrain",
    name: "Powertrain Plan",
    tagline: "The parts that cost the most to fix",
    base: 59,
    includes: ["Engine", "Transmission", "Drive axle and transfer case", "24/7 roadside assistance"],
  },
  {
    key: "plus",
    name: "Powertrain Plus Plan",
    tagline: "Powertrain plus major systems",
    base: 89,
    includes: ["Everything in Powertrain", "Air conditioning and cooling", "Brakes and steering", "Electrical and fuel systems"],
  },
  {
    key: "complete",
    name: "Complete Plan",
    tagline: "Our most complete protection",
    base: 119,
    includes: ["Most mechanical and electrical parts", "High-tech and electronic components", "Rental car and trip interruption", "Listed exclusions instead of listed parts"],
  },
];

export const PLAN_INTEREST = ["powertrain", "plus", "complete", "not_sure"] as const;

// Cars older than this get a call instead of an online estimate.
export const MAX_AGE_YEARS = 20;

// Mileage values are the top of each range chosen in the form; "200000" means 150,000 or more.
const MILEAGE_FACTOR: Record<number, number> = { 25000: 0.85, 50000: 0.92, 75000: 1, 100000: 1.08, 125000: 1.18, 150000: 1.3, 200000: 1.45 };

// Brands with costlier parts and labor pay more; brands known for lower repair costs pay a little less.
const MAKE_FACTOR: Record<string, number> = {
  "ALFA ROMEO": 1.3, AUDI: 1.25, BMW: 1.3, CADILLAC: 1.2, GENESIS: 1.1, INFINITI: 1.15, JAGUAR: 1.35, "LAND ROVER": 1.4,
  LEXUS: 1.05, LINCOLN: 1.2, MASERATI: 1.4, "MERCEDES-BENZ": 1.3, MINI: 1.2, POLESTAR: 1.2, PORSCHE: 1.4, RIVIAN: 1.3,
  TESLA: 1.25, VOLVO: 1.2, ACURA: 1.05, HONDA: 0.95, TOYOTA: 0.95, MAZDA: 0.97, HYUNDAI: 0.97, KIA: 0.97,
};

function ageFactor(age: number) {
  if (age <= 3) return 0.85;
  if (age <= 7) return 1;
  if (age <= 11) return 1.12;
  if (age <= 15) return 1.25;
  return 1.4;
}

export type PlanEstimate = (typeof PLANS)[number] & { low: number; high: number };

/**
 * Estimated monthly price range for each plan this car qualifies for, or [] when the car needs
 * a call instead (very old car or unknown mileage).
 */
export function estimatePlans(v: { year: number; make: string; mileage: number | null }, now = new Date()): PlanEstimate[] {
  const age = Math.max(0, now.getFullYear() - v.year);
  if (age > MAX_AGE_YEARS || !v.mileage) return [];
  const factor = ageFactor(age) * (MILEAGE_FACTOR[v.mileage] ?? 1.45) * (MAKE_FACTOR[v.make.toUpperCase()] ?? 1);
  // Typical eligibility: the most complete plans stop at higher mileage and age.
  const allowed = PLANS.filter((p) => {
    if (p.key === "complete") return v.mileage! <= 125000 && age <= 12;
    if (p.key === "plus") return v.mileage! <= 150000 && age <= 15;
    return true;
  });
  return allowed.map((p) => {
    const mid = p.base * factor;
    return { ...p, low: Math.round(mid * 0.9), high: Math.round(mid * 1.1) };
  });
}
