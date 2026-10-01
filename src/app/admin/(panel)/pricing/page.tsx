import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { db } from "@/lib/db";
import { basePrice, priceQuotes, type RiskProfile } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { STATES } from "@/lib/states";
import { Checkbox, FormField, Notice, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary, money } from "@/components/admin/ui";
import { savePricing } from "./actions";

export const dynamic = "force-dynamic";

const year = new Date().getFullYear();
const PROFILES: { name: string; detail: string; p: Omit<RiskProfile, "state"> }[] = [
  {
    name: "Typical driver",
    detail: "Age 38 · standard coverage · insured · clean record · 6-year-old car",
    p: { age: 38, coverageLevel: "standard", currentlyInsured: true, accidents: 0, violations: 0, licenseStatus: "valid", vehicleYear: year - 6 },
  },
  {
    name: "Young driver",
    detail: "Age 21 · standard coverage · insured · clean record · 2-year-old car",
    p: { age: 21, coverageLevel: "standard", currentlyInsured: true, accidents: 0, violations: 0, licenseStatus: "valid", vehicleYear: year - 2 },
  },
  {
    name: "Budget shopper",
    detail: "Age 45 · state minimum · not insured now · 1 ticket · 10-year-old car",
    p: { age: 45, coverageLevel: "state_minimum", currentlyInsured: false, accidents: 0, violations: 1, licenseStatus: "valid", vehicleYear: year - 10 },
  },
  {
    name: "Higher-risk driver",
    detail: "Age 52 · higher limits · insured · 2 accidents, 1 ticket · new car",
    p: { age: 52, coverageLevel: "premium", currentlyInsured: true, accidents: 2, violations: 1, licenseStatus: "valid", vehicleYear: year },
  },
];

function Num({ name, label, value, hint, prefix, suffix, step = "0.01" }: { name: string; label: string; value: number; hint?: string; prefix?: string; suffix?: string; step?: string }) {
  return (
    <FormField label={label} htmlFor={name} hint={hint}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-road">{prefix}</span>}
        <input id={name} name={name} type="number" step={step} defaultValue={value} required className={`${inputCls} ${prefix ? (prefix.length > 1 ? "pl-9" : "pl-7") : ""} ${suffix ? "pr-10" : ""}`} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-road">{suffix}</span>}
      </div>
    </FormField>
  );
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; state?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const state = STATES.some((s) => s.code === sp.state) ? sp.state! : "CA";
  const [{ pricing: r }, partners] = await Promise.all([getSettings(), db.partner.findMany({ orderBy: { sortOrder: "asc" } })]);
  const active = partners.filter((p) => p.active).length;

  return (
    <>
      <PageHeader title="Pricing" subtitle="Set how quote prices are calculated. Each partner then applies its own price factor." />
      <Notice saved={sp.saved} error={sp.error} />

      <form action={savePricing} className="grid gap-6 xl:grid-cols-2">
        <Card title="Base price and coverage">
          <div className="space-y-4">
            <Num name="basePrice" label="Base monthly price" value={r.basePrice} prefix="$" hint="Starting monthly price before any adjustments." />
            <div className="grid gap-4 sm:grid-cols-3">
              <Num name="cov_state_minimum" label="State minimum" value={r.coveragePercent.state_minimum} suffix="%" hint="-38 = 38% cheaper" />
              <Num name="cov_standard" label="Standard" value={r.coveragePercent.standard} suffix="%" />
              <Num name="cov_premium" label="Higher limits" value={r.coveragePercent.premium} suffix="%" hint="35 = 35% more" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Policy term" htmlFor="termMonths">
                <select id="termMonths" name="termMonths" defaultValue={String(r.termMonths)} className={inputCls}>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
              </FormField>
              <Num name="maxQuotes" label="Most quotes to show" value={r.maxQuotes} step="1" hint="Cheapest eligible partners first." />
            </div>
          </div>
        </Card>

        <Card title="Driver and vehicle adjustments">
          <div className="grid gap-4 sm:grid-cols-2">
            <Num name="ageUnder25" label="Driver under 25" value={r.ageUnder25} prefix="+$" hint="Added per month" />
            <Num name="age65Plus" label="Driver over 65" value={r.age65Plus} prefix="+$" hint="Added per month" />
            <Num name="perAccident" label="Each at-fault accident" value={r.perAccident} prefix="+$" hint="Added per month" />
            <Num name="perViolation" label="Each ticket or violation" value={r.perViolation} prefix="+$" hint="Added per month" />
            <Num name="uninsuredPercent" label="No current insurance" value={r.uninsuredPercent} suffix="%" hint="Surcharge on the total" />
            <Num name="newVehiclePercent" label="Car 3 years old or newer" value={r.newVehiclePercent} suffix="%" hint="Surcharge on the total" />
          </div>
        </Card>

        <Card title="Who gets online quotes">
          <div className="space-y-4">
            <Checkbox name="declineSuspended" label="No online quotes for suspended or revoked licenses" defaultChecked={r.declineSuspended} hint="These leads go to lead buyers or an agent instead." />
            <Num name="declineAtIncidents" label="No online quotes at this many accidents + tickets" value={r.declineAtIncidents} step="1" hint="0 = never decline for driving record." />
          </div>
        </Card>

        <Card title="Coverage descriptions shown with each quote">
          <div className="space-y-4">
            <FormField label="State minimum" htmlFor="sum_state_minimum">
              <input id="sum_state_minimum" name="sum_state_minimum" defaultValue={r.coverageSummary.state_minimum} required maxLength={160} className={inputCls} />
            </FormField>
            <FormField label="Standard" htmlFor="sum_standard">
              <input id="sum_standard" name="sum_standard" defaultValue={r.coverageSummary.standard} required maxLength={160} className={inputCls} />
            </FormField>
            <FormField label="Higher limits" htmlFor="sum_premium">
              <input id="sum_premium" name="sum_premium" defaultValue={r.coverageSummary.premium} required maxLength={160} className={inputCls} />
            </FormField>
          </div>
        </Card>

        <div className="xl:col-span-2">
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#E4E7EC] bg-white px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-road">Saved prices apply to new quote requests. Existing leads keep the prices they were shown.</p>
            <button className={btnPrimary}>Save pricing</button>
          </div>
        </div>
      </form>

      <div className="mt-8">
        <Card
          title="Preview: what visitors would see"
          action={
            <form className="flex items-center gap-2 text-sm">
              <label htmlFor="preview-state" className="text-road">State</label>
              <select id="preview-state" name="state" defaultValue={state} className={`${inputCls} h-9 w-auto`}>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
              <button className="rounded-lg border border-[#D0D5DD] px-3 py-1.5 font-semibold hover:bg-[#F9FAFB]">Show</button>
            </form>
          }
        >
          {active === 0 ? (
            <p className="text-sm text-road">
              No active partners, so visitors won&apos;t see any prices.{" "}
              <Link href="/admin/partners" className="font-semibold text-sky hover:underline">Add a partner</Link>.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {PROFILES.map(({ name, detail, p }) => {
                const profile = { ...p, state };
                const base = basePrice(r, profile);
                const quotes = priceQuotes(r, partners, profile);
                return (
                  <div key={name} className="rounded-lg border border-[#EEF0F3] p-4">
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-road">{detail}</p>
                    {base === null ? (
                      <p className="mt-3 text-sm text-amber-700">Declined: no online quotes for this driver.</p>
                    ) : quotes.length === 0 ? (
                      <p className="mt-3 text-sm text-amber-700">No partner fits this driver in {state}.</p>
                    ) : (
                      <ul className="mt-3 space-y-1.5 text-sm">
                        {quotes.map((q) => (
                          <li key={q.partner.id} className="flex justify-between gap-3">
                            <span>{q.partner.name}</span>
                            <span className="font-semibold tabular-nums">{money(q.monthly)}/mo</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
