import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ensureStateGuides, guidePath, limitsShort, quickAnswer } from "@/lib/state-guides";
import { Checkbox, FormField, Notice, SectionFooter, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { saveStateGuide } from "../actions";
import { ContentField } from "./ContentField";

export const dynamic = "force-dynamic";

const money = (n: number | null | undefined) => (n ? n.toLocaleString("en-US") : "");

export default async function EditStatePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin("admin");
  await ensureStateGuides();
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const g = await db.stateGuide.findUnique({ where: { code: code.toUpperCase() } });
  if (!g) notFound();

  return (
    <>
      <PageHeader
        title={`${g.name} guide`}
        subtitle={<>Lives at <code className="text-asphalt">{guidePath(g)}</code>. {g.published ? "Published." : "Draft: visitors can't see it yet."}</>}
        actions={
          <>
            <Link href="/admin/states" className={btnSecondary}>← All states</Link>
            {g.published && <a href={guidePath(g)} target="_blank" rel="noreferrer" className={btnSecondary}>View ↗</a>}
          </>
        }
      />
      <Notice saved={sp.saved} error={sp.error} />

      <form action={saveStateGuide} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <input type="hidden" name="code" value={g.code} />
        <div className="min-w-0 space-y-6">
          <Card title="Legal requirements">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              These are legal facts shown to the public. Check every value against the official source (state Department of Insurance or DMV) before ticking &ldquo;Facts checked&rdquo;.
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <FormField label="Bodily injury per person ($)" htmlFor="biPerPerson"><input id="biPerPerson" name="biPerPerson" defaultValue={money(g.biPerPerson)} inputMode="numeric" placeholder="30,000" className={inputCls} /></FormField>
              <FormField label="Bodily injury per accident ($)" htmlFor="biPerAccident"><input id="biPerAccident" name="biPerAccident" defaultValue={money(g.biPerAccident)} inputMode="numeric" placeholder="60,000" className={inputCls} /></FormField>
              <FormField label="Property damage ($)" htmlFor="pd"><input id="pd" name="pd" defaultValue={money(g.pd)} inputMode="numeric" placeholder="25,000" className={inputCls} /></FormField>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Checkbox name="noFault" label="No-fault state" defaultChecked={g.noFault} />
              <Checkbox name="pipRequired" label="Personal injury protection (PIP) required" defaultChecked={g.pipRequired} />
              <Checkbox name="umRequired" label="Uninsured motorist required" defaultChecked={g.umRequired} />
              <Checkbox name="uimRequired" label="Underinsured motorist required" defaultChecked={g.uimRequired} />
              <Checkbox name="medPayRequired" label="Medical payments required" defaultChecked={g.medPayRequired} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
              <FormField label="Minimum PIP ($)" htmlFor="pipMinimum"><input id="pipMinimum" name="pipMinimum" defaultValue={money(g.pipMinimum)} inputMode="numeric" className={inputCls} /></FormField>
              <FormField label="Official source link" htmlFor="sourceUrl" hint="The state Department of Insurance or DMV page you checked.">
                <input id="sourceUrl" name="sourceUrl" defaultValue={g.sourceUrl} placeholder="https://" className={inputCls} />
              </FormField>
            </div>
            <div className="mt-4">
              <FormField label="Special rules (optional)" htmlFor="requirementNote" hint="Shown on the page, e.g. recent changes or how this state differs.">
                <textarea id="requirementNote" name="requirementNote" defaultValue={g.requirementNote} maxLength={600} rows={2} className={`${inputCls} h-auto py-2`} />
              </FormField>
            </div>
          </Card>

          <Card title="Extra content (optional)">
            <p className="mb-3 text-sm text-road">Add local details that make this page unique: average prices with a source, major cities, local driving risks, state programs. Unique content ranks better.</p>
            <FormField label="Opening line under the title" htmlFor="intro">
              <textarea id="intro" name="intro" defaultValue={g.intro} maxLength={400} rows={2} className={`${inputCls} h-auto py-2`} placeholder={`What every driver in ${g.name} must carry by law, what's worth adding, and how to compare quotes.`} />
            </FormField>
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium">Extra section</p>
              <ContentField initialHtml={g.contentHtml} />
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Publish">
            <div className="space-y-3">
              <Checkbox name="verified" label="Facts checked against the official source" defaultChecked={!!g.verifiedAt} hint={g.verifiedAt ? `Last checked ${g.verifiedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}. Changing a fact needs a new check.` : "Required before publishing."} />
              <Checkbox name="published" label="Published on the website" defaultChecked={g.published} />
            </div>
            <SectionFooter><button className={btnPrimary}>Save</button></SectionFooter>
          </Card>

          <Card title="Preview of the quick answer">
            <p className="text-sm leading-relaxed text-road">{limitsShort(g) || g.pd ? quickAnswer(g) : "Enter the minimum amounts to see the answer shown at the top of the page."}</p>
          </Card>

          <Card title="Average price (optional)">
            <FormField label="Average full coverage per year ($)" htmlFor="avgAnnualPremium"><input id="avgAnnualPremium" name="avgAnnualPremium" defaultValue={money(g.avgAnnualPremium)} inputMode="numeric" className={inputCls} /></FormField>
            <div className="mt-3">
              <FormField label="Source of that figure" htmlFor="premiumSource" hint="Only show a price you can cite.">
                <input id="premiumSource" name="premiumSource" defaultValue={g.premiumSource} maxLength={200} className={inputCls} />
              </FormField>
            </div>
          </Card>

          <Card title="SEO (optional)">
            <FormField label="Title" htmlFor="seoTitle"><input id="seoTitle" name="seoTitle" defaultValue={g.seoTitle} maxLength={70} placeholder={`${g.name} Car Insurance Requirements (2026)`} className={inputCls} /></FormField>
            <div className="mt-3">
              <FormField label="Description" htmlFor="seoDescription"><textarea id="seoDescription" name="seoDescription" defaultValue={g.seoDescription} maxLength={170} rows={3} placeholder="Defaults to the quick answer" className={`${inputCls} h-auto py-2`} /></FormField>
            </div>
          </Card>
        </aside>
      </form>
    </>
  );
}
