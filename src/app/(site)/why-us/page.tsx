import type { Metadata } from "next";
import { CustomerReviews } from "@/components/CustomerReviews";
import { Reveal } from "@/components/Reveal";
import { PageHero, QuoteBanner } from "@/components/sections";
import { ogMetadata } from "@/lib/og";
import { fillCompany, getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

const title = `Why Choose ${site.name}`;
const description = `Why drivers choose ${site.name}: fast help with unexpected repairs, any ASE-certified shop, flexible plans and a 30-day money-back guarantee.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/why-us" },
  ...ogMetadata({ eyebrow: "Why us", title, subtitle: description }, { url: "/why-us", title: `${title} | ${site.name}`, description }),
};

export default async function WhyUsPage() {
  const { content } = await getSettings();
  const reasons = content.reasons.map((r) => ({ title: fillCompany(r.title), body: fillCompany(r.body) }));
  return (
    <>
      <PageHero eyebrow="Why us" title={title} intro={fillCompany(content.whyIntro)} crumbs={[{ name: "Why us", href: "/why-us" }]} />
      {/* On its own page every reason is visible at once (better to read, and for Google). */}
      <section className="bg-white">
        <ul className="mx-auto grid max-w-6xl gap-6 px-5 py-14 sm:grid-cols-2 md:py-16">
          {reasons.map((r, i) => (
            <li key={r.title}>
              <Reveal delay={i * 80} className="h-full rounded-2xl border border-rail p-7 transition hover:shadow-[0_12px_32px_rgba(38,42,48,0.08)]">
                <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-line text-lg font-extrabold text-asphalt">{i + 1}</span>
                <h2 className="mt-5 text-xl font-bold text-asphalt">{r.title}</h2>
                <p className="mt-2 leading-relaxed text-road">{r.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
      <CustomerReviews />
      <QuoteBanner />
    </>
  );
}
