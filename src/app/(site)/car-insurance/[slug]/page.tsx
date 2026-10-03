import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageHero, QuoteBanner } from "@/components/sections";
import { sanitizePostHtml } from "@/lib/blog";
import { db } from "@/lib/db";
import { ogMetadata } from "@/lib/og";
import { jsonLd } from "@/lib/security";
import { site } from "@/lib/site";
import { NEIGHBORS, guidePath, limitsShort, quickAnswer, stateFaqs, usd } from "@/lib/state-guides";

const getGuide = cache((slug: string) => (/^[a-z-]{2,40}$/.test(slug) ? db.stateGuide.findFirst({ where: { slug, published: true } }) : null));

const titleFor = (name: string) => `${name} Car Insurance Requirements (2026)`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  if (!g) return { title: "Page not found", robots: { index: false } };
  const title = g.seoTitle || titleFor(g.name);
  const short = limitsShort(g);
  const auto = `${g.name} car insurance minimum: ${short ? `${short} liability` : "see requirements"}${g.pipRequired ? " plus PIP" : ""}. ${g.noFault ? "No-fault state." : "At-fault state."} What's required, what's worth adding and how to save.`;
  const description = g.seoDescription || (auto.length <= 160 ? auto : auto.slice(0, 157).replace(/\s+\S*$/, "") + "…");
  const url = guidePath(g);
  return {
    title,
    description,
    alternates: { canonical: url },
    ...ogMetadata({ eyebrow: "Car insurance by state", title: `${g.name} car insurance requirements`, subtitle: limitsShort(g) ? `Minimum liability: ${limitsShort(g)}` : description }, { url, title: `${title} | ${site.name}`, description }),
  };
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rail py-3 last:border-0">
      <dt className="text-road">{label}</dt>
      <dd className="text-right font-semibold text-asphalt">{value}</dd>
    </div>
  );
}

export default async function StateGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();

  const neighbors = await db.stateGuide.findMany({
    where: { code: { in: NEIGHBORS[g.code] ?? [] }, published: true },
    orderBy: { name: "asc" },
    select: { name: true, slug: true, biPerPerson: true, biPerAccident: true, pd: true },
  });
  const answer = quickAnswer(g);
  const faqs = stateFaqs(g);
  const short = limitsShort(g);
  const extra = g.contentHtml ? sanitizePostHtml(g.contentHtml) : "";
  const url = `${site.url}${guidePath(g)}`;
  const reviewed = g.verifiedAt?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: titleFor(g.name),
        description: answer,
        mainEntityOfPage: url,
        dateModified: g.updatedAt.toISOString(),
        ...(g.verifiedAt ? { lastReviewed: g.verifiedAt.toISOString() } : {}),
        about: { "@type": "State", name: g.name, containedInPlace: { "@type": "Country", name: "United States" } },
        publisher: { "@id": `${site.url}/#organization` },
        ...(g.sourceUrl ? { citation: g.sourceUrl } : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PageHero
        eyebrow="Car insurance by state"
        title={`${g.name} Car Insurance Requirements`}
        intro={g.intro || `What every driver in ${g.name} must carry by law, what's worth adding, and how to compare quotes.`}
        crumbs={[{ name: "Car insurance by state", href: "/car-insurance" }, { name: g.name, href: guidePath(g) }]}
      />

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <article className="min-w-0">
          {/* Short, direct answer first: what people (and AI search tools) look for. */}
          <section aria-label="Quick answer" className="rounded-2xl bg-[linear-gradient(155deg,#E8F0FB_0%,#F7F9FC_60%,#FFF6DA_100%)] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Quick answer</p>
            <p className="mt-2 text-lg leading-relaxed text-asphalt">{answer}</p>
          </section>

          <div className="post-content mt-10">
            {short && (
              <>
                <h2>Minimum car insurance in {g.name}</h2>
                <p>
                  {g.name}&apos;s minimum is often written as <strong>{short}</strong>. That means your policy pays up to {usd(g.biPerPerson)} for injuries to any one
                  person you hurt in a crash, up to {usd(g.biPerAccident)} in total for everyone injured in that crash, and up to {usd(g.pd)} for damage to other
                  people&apos;s cars or property.
                </p>
                <p>These limits pay for <em>other people</em>. They don&apos;t pay to repair your own car or treat your own injuries; that takes optional coverage.</p>
              </>
            )}
            {g.requirementNote && <p>{g.requirementNote}</p>}

            <h2>Is {g.name} a no-fault state?</h2>
            {g.noFault ? (
              <p>
                Yes. After an accident in {g.name}, your own personal injury protection (PIP) pays your medical bills first, no matter who caused the crash
                {g.pipMinimum ? `; the required minimum is ${usd(g.pipMinimum)}` : ""}. Lawsuits against the other driver are limited to more serious injuries.
              </p>
            ) : (
              <p>
                No. {g.name} is an at-fault state. The driver who causes an accident is responsible for the other people&apos;s injuries and damage, which is why
                liability coverage is required. {g.pipRequired ? `${g.name} still requires personal injury protection (PIP)${g.pipMinimum ? ` of at least ${usd(g.pipMinimum)}` : ""}.` : ""}
              </p>
            )}

            <h2>Is the state minimum enough?</h2>
            <p>
              For most drivers, no. Hospital bills from a single serious crash can pass {usd(g.biPerAccident || 50000)} quickly, and anything above your limits
              can come out of your own pocket. A common recommendation is <strong>100/300/100</strong> liability, plus:
            </p>
            <ul>
              <li><strong>Collision</strong>: repairs your own car after an accident, whoever is at fault.</li>
              <li><strong>Comprehensive</strong>: theft, hail, flooding, fire and hitting an animal.</li>
              {!g.umRequired && <li><strong>Uninsured/underinsured motorist</strong>: protects you when the other driver has little or no insurance.</li>}
              <li><strong>Roadside assistance and rental reimbursement</strong>: inexpensive extras that help when your car is in the shop.</li>
            </ul>
            <p>
              Insurance doesn&apos;t cover mechanical breakdowns. For engine, transmission or electrical failures, see <Link href="/repair-costs">what common repairs cost</Link> and{" "}
              <Link href="/why-us">how a vehicle service contract can help</Link>.
            </p>

            <h2>How to lower your car insurance in {g.name}</h2>
            <ul>
              <li>Compare quotes from several companies. Prices for the same driver can vary by hundreds of dollars a year.</li>
              <li>Raise your collision and comprehensive deductibles if you have savings to cover them.</li>
              <li>Ask about discounts: bundling home and auto, safe driver, good student, paying in full and paperless billing.</li>
              <li>Keep continuous coverage. A gap, even a short one, usually raises your price.</li>
              <li>Review your coverage every year, especially after paying off a car loan.</li>
            </ul>
          </div>

          {extra && <div className="post-content mt-8" dangerouslySetInnerHTML={{ __html: extra }} />}

          <section className="mt-12">
            <h2 className="text-2xl font-extrabold text-asphalt">{g.name} car insurance FAQ</h2>
            <div className="mt-4 divide-y divide-rail border-y border-rail">
              {faqs.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                    {f.q}
                    <span aria-hidden className="text-xl text-road transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 leading-relaxed text-road">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <p className="mt-8 text-sm leading-relaxed text-road">
            {reviewed && <>Requirements last checked {reviewed}. </>}
            Laws change; confirm current rules with {g.sourceUrl ? <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky underline-offset-2 hover:underline">the official {g.name} source</a> : `${g.name}'s Department of Insurance`}. This page is general information, not legal advice.
          </p>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl bg-[#F7F9FC] p-6">
            <h2 className="text-lg font-bold text-asphalt">{g.name} at a glance</h2>
            <dl className="mt-3 text-sm">
              {g.insuranceOptional && <Fact label="Insurance required" value="No (proof of payment ability)" />}
              {short && <Fact label={g.insuranceOptional ? "Financial responsibility" : "Minimum liability"} value={short} />}
              {g.biPerPerson > 0 && <Fact label="Bodily injury, per person" value={usd(g.biPerPerson)} />}
              {g.biPerAccident > 0 && <Fact label="Bodily injury, per accident" value={usd(g.biPerAccident)} />}
              {g.pd > 0 && <Fact label="Property damage" value={usd(g.pd)} />}
              <Fact label="Fault system" value={g.noFault ? "No-fault" : "At-fault"} />
              <Fact label="PIP required" value={g.pipRequired ? (g.pipMinimum ? usd(g.pipMinimum) : "Yes") : "No"} />
              <Fact label="Uninsured motorist" value={g.umRequired ? "Required" : "Optional"} />
              {g.avgAnnualPremium && <Fact label="Average full coverage" value={`${usd(g.avgAnnualPremium)}/yr`} />}
            </dl>
            {g.avgAnnualPremium && g.premiumSource && <p className="mt-2 text-xs text-road">Average premium source: {g.premiumSource}</p>}
          </section>
          <section className="rounded-2xl bg-asphalt p-6 text-white">
            <p className="text-lg font-bold">Compare {g.name} car insurance quotes</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">Free, about 5 minutes, no obligation.</p>
            <Link href="/quote/auto" className="mt-4 inline-flex w-full justify-center rounded-lg bg-line px-4 py-3 font-bold text-asphalt hover:bg-[#E3B21F]">Get my free quote</Link>
          </section>
          {neighbors.length > 0 && (
            <section className="rounded-2xl bg-[#F7F9FC] p-6">
              <h2 className="text-lg font-bold text-asphalt">Nearby states</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {neighbors.map((n) => (
                  <li key={n.slug} className="flex justify-between gap-3">
                    <Link href={guidePath(n)} className="font-semibold text-sky hover:underline">{n.name}</Link>
                    <span className="text-road">{limitsShort(n)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/car-insurance" className="mt-4 block text-sm font-semibold text-asphalt hover:text-sky">All states →</Link>
            </section>
          )}
        </aside>
      </div>
      <QuoteBanner />
    </>
  );
}
