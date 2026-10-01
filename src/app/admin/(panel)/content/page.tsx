import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettings } from "@/lib/settings";
import { FormField, Notice, SectionFooter, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary } from "@/components/admin/ui";
import { saveFaqs, saveHero, saveNavigation, saveRepairCosts, saveReviews, saveWhy } from "./actions";

export const dynamic = "force-dynamic";

const area = `${inputCls} h-auto py-2.5`;
const EXTRA_ROWS = 2;

function Section({ id, title, view, children }: { id: string; title: string; view: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-6">
      <Card title={title} action={<Link href={view} target="_blank" className="text-sm font-semibold text-sky hover:underline">View on site ↗</Link>}>
        {children}
      </Card>
    </div>
  );
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin("admin");
  const [{ saved, error }, { content: c, navigation: nav }] = await Promise.all([searchParams, getSettings()]);
  const navRows = [...nav.links, ...Array(EXTRA_ROWS).fill({ label: "", href: "" })];
  const theme = c.reviews.theme ?? "trustpilot";
  const reasonRows = [...c.reasons, ...Array(EXTRA_ROWS).fill({ title: "", body: "" })];
  const faqRows = [...c.faqs, ...Array(EXTRA_ROWS).fill({ q: "", a: "" })];
  const reviewRows = [...c.reviews.items, ...Array(EXTRA_ROWS).fill({ name: "", location: "", date: "", rating: 5, text: "" })];

  return (
    <>
      <PageHeader
        title="Website content"
        subtitle={<>Edit the words on your website. Type <code className="font-semibold text-asphalt">{"{company}"}</code> anywhere to insert your business name.</>}
      />
      <Notice saved={saved} error={error} />
      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        {[["navigation", "Navigation"], ["hero", "Homepage hero"], ["why", "Why choose us"], ["faqs", "FAQs"], ["repair", "Repair prices"], ["reviews", "Reviews"]].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="rounded-lg border border-[#E4E7EC] bg-white px-3 py-1.5 font-medium hover:border-sky hover:text-sky">{l}</a>
        ))}
      </nav>

      <div className="space-y-6">
        <Section id="navigation" title="Navigation bar" view="/">
          <form action={saveNavigation} className="space-y-4">
            <p className="text-sm text-road">
              Links in the header, left to right. Use a page path like <code className="text-asphalt">/blog</code>, a section like <code className="text-asphalt">/#faq</code>, or a full <code className="text-asphalt">https://</code> address. Clear both boxes to remove a link.
            </p>
            {navRows.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                <input name={`nav_label_${i}`} defaultValue={l.label} maxLength={30} placeholder="Label, e.g. Blog" aria-label={`Link ${i + 1} label`} className={inputCls} />
                <input name={`nav_href_${i}`} defaultValue={l.href} maxLength={300} placeholder="/blog" aria-label={`Link ${i + 1} address`} className={inputCls} />
              </div>
            ))}
            <div className="grid gap-3 border-t border-[#EEF0F3] pt-4 sm:grid-cols-[1fr_2fr]">
              <FormField label="Button text" htmlFor="ctaLabel" hint="The yellow button on the right. Leave empty to hide it.">
                <input id="ctaLabel" name="ctaLabel" defaultValue={nav.ctaLabel} maxLength={30} className={inputCls} />
              </FormField>
              <FormField label="Button link" htmlFor="ctaHref">
                <input id="ctaHref" name="ctaHref" defaultValue={nav.ctaHref} maxLength={300} className={inputCls} />
              </FormField>
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" name="showPhone" defaultChecked={nav.showPhone} className="h-4 w-4 accent-sky" />
              Show the phone number in the header
            </label>
            <SectionFooter><button className={btnPrimary}>Save navigation</button></SectionFooter>
          </form>
        </Section>

        <Section id="hero" title="Homepage hero" view="/">
          <form action={saveHero} className="space-y-4">
            <FormField label="Small label above the headline" htmlFor="eyebrow"><input id="eyebrow" name="eyebrow" defaultValue={c.hero.eyebrow} maxLength={60} className={inputCls} /></FormField>
            <FormField label="Headline" htmlFor="title" hint="Up to 90 characters."><input id="title" name="title" defaultValue={c.hero.title} maxLength={90} required className={inputCls} /></FormField>
            <FormField label="Supporting text" htmlFor="subtitle"><textarea id="subtitle" name="subtitle" defaultValue={c.hero.subtitle} maxLength={240} rows={2} className={area} /></FormField>
            <SectionFooter><button className={btnPrimary}>Save hero</button></SectionFooter>
          </form>
        </Section>

        <Section id="why" title="Why choose us" view="/#why-choose">
          <form action={saveWhy} className="space-y-4">
            <FormField label="Intro paragraph" htmlFor="whyIntro"><textarea id="whyIntro" name="whyIntro" defaultValue={c.whyIntro} maxLength={800} rows={4} className={area} /></FormField>
            <p className="text-sm font-medium">Slides <span className="font-normal text-road">· clear a title to remove a slide; fill an empty row to add one</span></p>
            {reasonRows.map((r, i) => (
              <div key={i} className="grid gap-3 rounded-lg border border-[#EEF0F3] p-3 sm:grid-cols-[220px_1fr]">
                <input name={`reason_title_${i}`} defaultValue={r.title} maxLength={60} placeholder={`Slide ${i + 1} title`} aria-label={`Slide ${i + 1} title`} className={inputCls} />
                <textarea name={`reason_body_${i}`} defaultValue={r.body} maxLength={400} rows={2} placeholder="Slide text" aria-label={`Slide ${i + 1} text`} className={area} />
              </div>
            ))}
            <SectionFooter><button className={btnPrimary}>Save slides</button></SectionFooter>
          </form>
        </Section>

        <Section id="faqs" title="Frequently asked questions" view="/#faq">
          <form action={saveFaqs} className="space-y-3">
            <p className="text-sm text-road">The first answer also shows your phone number. Clear a question to remove it; fill an empty row to add one.</p>
            {faqRows.map((f, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-[#EEF0F3] p-3">
                <input name={`faq_q_${i}`} defaultValue={f.q} maxLength={160} placeholder={`Question ${i + 1}`} aria-label={`Question ${i + 1}`} className={`${inputCls} font-medium`} />
                <textarea name={`faq_a_${i}`} defaultValue={f.a} maxLength={1200} rows={2} placeholder="Answer" aria-label={`Answer ${i + 1}`} className={area} />
              </div>
            ))}
            <SectionFooter><button className={btnPrimary}>Save FAQs</button></SectionFooter>
          </form>
        </Section>

        <Section id="repair" title="Repair prices in the car diagram" view="/#repair-costs">
          <form action={saveRepairCosts}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(c.repairCosts).map(([part, cost]) => (
                <FormField key={part} label={part} htmlFor={`cost_${part}`}>
                  <input id={`cost_${part}`} name={`cost_${part}`} defaultValue={cost} maxLength={24} required className={inputCls} />
                </FormField>
              ))}
            </div>
            <p className="mt-3 text-xs text-road">Use prices you can back up. The footnote on the website credits ConsumerAffairs data.</p>
            <SectionFooter><button className={btnPrimary}>Save prices</button></SectionFooter>
          </form>
        </Section>

        <Section id="reviews" title="Customer reviews" view="/">
          <form action={saveReviews} className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              Only add real reviews of your business, copied word for word, with the platform they came from. The section stays hidden until at least one review is added.
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Style</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {([
                  ["trustpilot", "Trustpilot", "Green star boxes, “Excellent” score, review titles", "#00B67A"],
                  ["google", "Google", "Google “G”, yellow stars, round initials", "#FBBC04"],
                ] as const).map(([value, label, hint, color]) => (
                  <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#D0D5DD] p-4 has-[:checked]:border-sky has-[:checked]:ring-4 has-[:checked]:ring-sky/15">
                    <input type="radio" name="theme" value={value} defaultChecked={theme === value} className="mt-1 h-4 w-4 accent-sky" />
                    <span>
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="flex gap-0.5" aria-hidden>
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={value === "trustpilot" ? "h-3.5 w-3.5" : "h-3.5 w-3.5 rounded-full"} style={{ background: color }} />
                          ))}
                        </span>
                        {label}
                      </span>
                      <span className="mt-1 block text-xs text-road">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <FormField label="Seconds between slides" htmlFor="autoplaySeconds" hint="The reviews slide sideways on their own and pause when a visitor points at them. 0 = don't move.">
              <input id="autoplaySeconds" name="autoplaySeconds" type="number" min={0} max={30} defaultValue={c.reviews.autoplaySeconds ?? 4} className={`${inputCls} max-w-[120px]`} />
            </FormField>
            <p className="text-sm font-medium">Overall rating <span className="font-normal text-road">· optional</span></p>
            <div className="grid gap-3 sm:grid-cols-[1fr_100px_120px_1.4fr]">
              <input name="platform" defaultValue={c.reviews.summary?.platform ?? ""} maxLength={60} placeholder="Platform, e.g. Google" aria-label="Review platform" className={inputCls} />
              <input name="summaryRating" type="number" step="0.1" min={1} max={5} defaultValue={c.reviews.summary?.rating ?? ""} placeholder="4.8" aria-label="Average rating" className={inputCls} />
              <input name="summaryCount" type="number" min={1} defaultValue={c.reviews.summary?.count ?? ""} placeholder="No. of ratings" aria-label="Number of ratings" className={inputCls} />
              <input name="summaryUrl" defaultValue={c.reviews.summary?.url ?? ""} placeholder="https:// link to your reviews" aria-label="Reviews link" className={inputCls} />
            </div>
            <p className="text-sm font-medium">Reviews</p>
            {reviewRows.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-[#EEF0F3] p-3 sm:grid-cols-[1fr_1fr_1fr_90px]">
                <input name={`rev_name_${i}`} defaultValue={r.name} maxLength={60} placeholder="First name" aria-label={`Review ${i + 1} name`} className={inputCls} />
                <input name={`rev_location_${i}`} defaultValue={r.location} maxLength={60} placeholder="City, ST" aria-label={`Review ${i + 1} location`} className={inputCls} />
                <input name={`rev_date_${i}`} defaultValue={r.date} maxLength={30} placeholder="May 9, 2026" aria-label={`Review ${i + 1} date`} className={inputCls} />
                <select name={`rev_rating_${i}`} defaultValue={String(r.rating)} aria-label={`Review ${i + 1} stars`} className={inputCls}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                </select>
                <input name={`rev_title_${i}`} defaultValue={r.title ?? ""} maxLength={100} placeholder="Review title (optional), e.g. Great service, fast quote" aria-label={`Review ${i + 1} title`} className={`${inputCls} sm:col-span-4`} />
                <textarea name={`rev_text_${i}`} defaultValue={r.text} maxLength={600} rows={2} placeholder="Review text" aria-label={`Review ${i + 1} text`} className={`${area} sm:col-span-4`} />
              </div>
            ))}
            <p className="text-sm font-medium">Award <span className="font-normal text-road">· optional, only one actually given to your business</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="awardText" defaultValue={c.reviews.award?.text ?? ""} maxLength={120} placeholder="Awarded “Best Value” by Example.com" aria-label="Award text" className={inputCls} />
              <input name="awardUrl" defaultValue={c.reviews.award?.url ?? ""} placeholder="https:// link to the award" aria-label="Award link" className={inputCls} />
            </div>
            <SectionFooter><button className={btnPrimary}>Save reviews</button></SectionFooter>
          </form>
        </Section>
      </div>
    </>
  );
}
