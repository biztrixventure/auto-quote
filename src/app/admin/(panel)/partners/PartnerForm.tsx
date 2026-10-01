import type { Partner } from "@prisma/client";
import Link from "next/link";
import { list } from "@/lib/pricing";
import { STATES } from "@/lib/states";
import { Checkbox, FormField, inputCls } from "@/components/admin/forms";
import { Card, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { savePartner } from "./actions";

const COVERAGES: [string, string][] = [
  ["state_minimum", "State minimum"],
  ["standard", "Standard"],
  ["premium", "Higher limits"],
];

export function PartnerForm({ partner }: { partner?: Partner }) {
  const states = list(partner?.states ?? "");
  const coverage = list(partner?.coverageLevels ?? "state_minimum,standard,premium");
  const allStates = states.length === 0;
  const n = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

  return (
    <form action={savePartner} className="grid gap-6 xl:grid-cols-[1fr_380px]">
      {partner && <input type="hidden" name="id" value={partner.id} />}

      <div className="space-y-6">
        <Card title="Details shown to visitors">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Partner name" htmlFor="name" hint="Shown on the quote card. Only list companies you have an agreement with.">
                <input id="name" name="name" required maxLength={80} defaultValue={partner?.name} placeholder="e.g. Acme Insurance" className={inputCls} />
              </FormField>
            </div>
            <FormField label="Tagline" htmlFor="tagline" hint="Optional. Up to 80 characters.">
              <input id="tagline" name="tagline" maxLength={80} defaultValue={partner?.tagline ?? ""} placeholder="e.g. Great for young drivers" className={inputCls} />
            </FormField>
            <FormField label="Logo URL" htmlFor="logoUrl" hint="Optional. https:// link or a path like /partners/acme.png">
              <input id="logoUrl" name="logoUrl" defaultValue={partner?.logoUrl ?? ""} placeholder="https://…" className={inputCls} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="“Buy online” link" htmlFor="bindUrl" hint="Optional. Leave blank to show a “Call to buy” button with your phone number instead.">
                <input id="bindUrl" name="bindUrl" defaultValue={partner?.bindUrl ?? ""} placeholder="https://…" className={inputCls} />
              </FormField>
            </div>
          </div>
        </Card>

        <Card title="Where this partner quotes">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Coverage levels offered</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {COVERAGES.map(([k, label]) => (
                  <Checkbox key={k} name="coverageLevels" value={k} label={label} defaultChecked={coverage.includes(k)} />
                ))}
              </div>
            </div>
            <div>
              <Checkbox name="allStates" label="All states" defaultChecked={allStates} hint="Untick to choose specific states below." />
              <fieldset className="mt-3 rounded-lg border border-[#EEF0F3] p-3">
                <legend className="px-1 text-xs font-medium text-road">States (used when “All states” is unticked)</legend>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 sm:grid-cols-5 lg:grid-cols-7">
                  {STATES.map((s) => (
                    <label key={s.code} className="flex cursor-pointer items-center gap-2 text-sm" title={s.name}>
                      <input type="checkbox" name="states" value={s.code} defaultChecked={states.includes(s.code)} className="h-4 w-4 cursor-pointer rounded accent-sky" />
                      {s.code}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </Card>

        <Card title="Which drivers this partner accepts">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Minimum age" htmlFor="minAge" hint="Blank = no limit">
              <input id="minAge" name="minAge" type="number" min={16} max={100} defaultValue={n(partner?.minAge)} className={inputCls} />
            </FormField>
            <FormField label="Maximum age" htmlFor="maxAge" hint="Blank = no limit">
              <input id="maxAge" name="maxAge" type="number" min={16} max={120} defaultValue={n(partner?.maxAge)} className={inputCls} />
            </FormField>
            <FormField label="Most at-fault accidents" htmlFor="maxAccidents" hint="Blank = no limit">
              <input id="maxAccidents" name="maxAccidents" type="number" min={0} max={20} defaultValue={n(partner?.maxAccidents)} className={inputCls} />
            </FormField>
            <FormField label="Most tickets" htmlFor="maxViolations" hint="Blank = no limit">
              <input id="maxViolations" name="maxViolations" type="number" min={0} max={20} defaultValue={n(partner?.maxViolations)} className={inputCls} />
            </FormField>
          </div>
          <div className="mt-4">
            <Checkbox name="acceptsUninsured" label="Quotes drivers who don't have insurance right now" defaultChecked={partner?.acceptsUninsured ?? true} />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Pricing and visibility">
          <div className="space-y-4">
            <FormField label="Price factor" htmlFor="priceFactor" hint="Multiplies the price from the Pricing page. 1 = same, 0.9 = 10% cheaper, 1.15 = 15% more.">
              <input id="priceFactor" name="priceFactor" type="number" step="0.01" min={0.1} max={5} required defaultValue={partner?.priceFactor ?? 1} className={inputCls} />
            </FormField>
            <FormField label="Display order" htmlFor="sortOrder" hint="Lower numbers show first when prices are equal.">
              <input id="sortOrder" name="sortOrder" type="number" min={0} max={999} required defaultValue={partner?.sortOrder ?? 0} className={inputCls} />
            </FormField>
            <Checkbox name="active" label="Show in quote results" defaultChecked={partner?.active ?? true} />
          </div>
        </Card>
        <div className="flex gap-2">
          <button className={`${btnPrimary} flex-1`}>{partner ? "Save changes" : "Add partner"}</button>
          <Link href="/admin/partners" className={btnSecondary}>Cancel</Link>
        </div>
      </div>
    </form>
  );
}
