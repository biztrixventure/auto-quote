"use server";

import { requireAdmin } from "@/lib/admin-guard";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { saveSetting } from "@/lib/settings";

const num = (min: number, max: number) => z.coerce.number({ invalid_type_error: "must be a number" }).min(min).max(max);

const schema = z.object({
  basePrice: num(1, 5000),
  cov_state_minimum: num(-90, 300),
  cov_standard: num(-90, 300),
  cov_premium: num(-90, 300),
  ageUnder25: num(0, 2000),
  age65Plus: num(0, 2000),
  perAccident: num(0, 2000),
  perViolation: num(0, 2000),
  uninsuredPercent: num(0, 300),
  newVehiclePercent: num(0, 300),
  termMonths: z.coerce.number().refine((n) => n === 6 || n === 12, "must be 6 or 12"),
  maxQuotes: num(1, 10).int(),
  declineAtIncidents: num(0, 20).int(),
  sum_state_minimum: z.string().trim().min(1).max(160),
  sum_standard: z.string().trim().min(1).max(160),
  sum_premium: z.string().trim().min(1).max(160),
});

const NAMES: Record<string, string> = {
  basePrice: "Base monthly price",
  cov_state_minimum: "State minimum adjustment",
  cov_standard: "Standard adjustment",
  cov_premium: "Higher limits adjustment",
  ageUnder25: "Under 25 surcharge",
  age65Plus: "Over 65 surcharge",
  perAccident: "Per accident",
  perViolation: "Per violation",
  uninsuredPercent: "No current insurance",
  newVehiclePercent: "Newer vehicle",
  termMonths: "Policy term",
  maxQuotes: "Quotes shown",
  declineAtIncidents: "Decline threshold",
  sum_state_minimum: "State minimum description",
  sum_standard: "Standard description",
  sum_premium: "Higher limits description",
};

export async function savePricing(f: FormData) {
  const me = await requireAdmin("admin");
  const parsed = schema.safeParse(Object.fromEntries(f));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = NAMES[String(issue.path[0])] ?? String(issue.path[0]);
    redirect(`/admin/pricing?${new URLSearchParams({ error: `${field}: ${issue.message.toLowerCase()}.` })}`);
  }
  const d = parsed.data;
  const value = {
    basePrice: d.basePrice,
    coveragePercent: { state_minimum: d.cov_state_minimum, standard: d.cov_standard, premium: d.cov_premium },
    ageUnder25: d.ageUnder25,
    age65Plus: d.age65Plus,
    perAccident: d.perAccident,
    perViolation: d.perViolation,
    uninsuredPercent: d.uninsuredPercent,
    newVehiclePercent: d.newVehiclePercent,
    termMonths: d.termMonths,
    maxQuotes: d.maxQuotes,
    declineSuspended: f.get("declineSuspended") === "on",
    declineAtIncidents: d.declineAtIncidents,
    coverageSummary: { state_minimum: d.sum_state_minimum, standard: d.sum_standard, premium: d.sum_premium },
  };
  await saveSetting("pricing", value);
  await audit(me.email, "settings_updated", "setting", "pricing", value);
  redirect(`/admin/pricing?${new URLSearchParams({ saved: "Pricing saved. New quotes will use these prices." })}`);
}
