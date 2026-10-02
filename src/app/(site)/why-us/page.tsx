import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CustomerReviews } from "@/components/CustomerReviews";
import { Reveal } from "@/components/Reveal";
import { PageHero, QuoteBanner } from "@/components/sections";
import { ogMetadata } from "@/lib/og";
import { fillCompany, getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

const title = `Why Choose ${site.name}`;
const description = `Why drivers trust ${site.name} for car repair coverage: any ASE-certified shop, flexible plans, licensed agents and a 30-day money-back guarantee.`;

export const metadata: Metadata = {
  title: "Why Choose Us for Car Repair Coverage",
  description,
  alternates: { canonical: "/why-us" },
  ...ogMetadata({ eyebrow: "Why us", title, subtitle: description, image: "/images/why-us/car-warranty-agent-1024.webp" }, { url: "/why-us", title: `${title} | ${site.name}`, description }),
};

const icon = (d: string) => (
  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
// One icon per reason, in order; extra reasons reuse them.
const REASON_ICONS = [
  icon("M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"), // wrench
  icon("M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"), // any shop, anywhere
  icon("M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4"), // flexible plans
  icon("M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3zM9 12l2 2 4-4"), // guarantee
];

const STEPS = [
  { title: "Tell us about your car", body: "Year, make, model and mileage. It takes about two minutes." },
  { title: "Compare your options", body: "See plans side by side, from essential to complete coverage." },
  { title: "Get your price", body: "A clear monthly price with the deductible shown up front." },
  { title: "Drive protected", body: "Covered repairs are handled with the shop, not by you." },
];

const COVERED = ["Engine", "Transmission", "Cooling system", "Brakes", "Electrical", "Drive axle", "A/C", "Roadside help", "Trip interruption"];

/** Soft gradient tile with a white panel inside: no outlines, depth comes from light and shadow. */
function Tile({ children, className = "", tint = "blue" }: { children: ReactNode; className?: string; tint?: "blue" | "warm" }) {
  const bg = tint === "blue" ? "bg-[linear-gradient(155deg,#E8F0FB_0%,#F7F9FC_45%,#FFF6DA_100%)]" : "bg-[linear-gradient(155deg,#FFF4D1_0%,#FBFAF6_50%,#E9F1FB_100%)]";
  return <div className={`h-full rounded-[28px] p-2.5 ${bg} ${className}`}>{children}</div>;
}
const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`h-full rounded-[22px] bg-white p-6 shadow-[0_10px_30px_rgba(31,95,173,0.08)] sm:p-7 ${className}`}>{children}</div>
);

export default async function WhyUsPage() {
  const [{ content }, biz] = await Promise.all([getSettings(), getSite()]);
  const reasons = content.reasons.map((r) => ({ title: fillCompany(r.title), body: fillCompany(r.body) }));

  return (
    <>
      <PageHero
        eyebrow={`Why ${site.name}`}
        title={title}
        intro={fillCompany(content.whyIntro)}
        crumbs={[{ name: "Why us", href: "/why-us" }]}
        media={
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 rounded-[36px] bg-[radial-gradient(circle_at_20%_20%,rgba(31,95,173,0.18),transparent_55%),radial-gradient(circle_at_85%_90%,rgba(242,194,48,0.28),transparent_50%)] blur-2xl" />
            <picture>
              <source type="image/webp" srcSet="/images/why-us/car-warranty-agent-640.webp 640w, /images/why-us/car-warranty-agent-1024.webp 1024w, /images/why-us/car-warranty-agent-1600.webp 1600w" sizes="(min-width: 1024px) 560px, 100vw" />
              <img
                src="/images/why-us/car-warranty-agent-1024.webp"
                alt={`${site.name} agent explaining car repair coverage options to a couple at a car dealership`}
                width={1600}
                height={1067}
                fetchPriority="high"
                decoding="async"
                className="relative aspect-[3/2] w-full rounded-[28px] object-cover shadow-[0_24px_60px_rgba(16,24,40,0.18)]"
              />
            </picture>
            <span className="absolute -left-2 top-6 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-asphalt shadow-[0_12px_30px_rgba(16,24,40,0.14)] sm:-left-5">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-line text-asphalt">{icon("M20 6 9 17l-5-5")}</span>
              Licensed agents
            </span>
            <span className="absolute -right-2 bottom-6 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-asphalt shadow-[0_12px_30px_rgba(16,24,40,0.14)] sm:-right-5">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-asphalt text-line">{icon("M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z")}</span>
              Any ASE-certified shop
            </span>
          </div>
        }
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/quote/auto" className="btn-primary bg-line text-asphalt hover:bg-[#E3B21F]">Get a free quote</Link>
          <a href={biz.phoneHref} className="btn-secondary">Call {biz.phone}</a>
        </div>
      </PageHero>

      {/* Reasons (edited in Admin → Content → Why choose us) */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">What sets us apart</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Protection built around real drivers</h2>
            <p className="mt-4 text-lg leading-relaxed text-road">
              A breakdown shouldn&apos;t turn into a financial emergency. Here&apos;s how {site.name} keeps repair costs predictable and the process simple.
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {reasons.map((r, i) => (
              <li key={r.title}>
                <Reveal delay={i * 80} className="h-full">
                  <Tile tint={i % 2 ? "warm" : "blue"} className="transition duration-300 hover:-translate-y-1">
                    <Panel>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-asphalt text-line">{REASON_ICONS[i % REASON_ICONS.length]}</span>
                      <h3 className="mt-5 text-xl font-bold text-asphalt">{r.title}</h3>
                      <p className="mt-2 leading-relaxed text-road">{r.body}</p>
                    </Panel>
                  </Tile>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works · What a plan can cover · Talk to an agent */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 pb-16 md:pb-20 lg:grid-cols-[1fr_1.25fr_1fr]">
          <Reveal className="h-full">
            <Tile>
              <Panel>
                <h2 className="text-lg font-bold text-asphalt">How it works</h2>
                <ol className="mt-5 space-y-1">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < STEPS.length - 1 && <span aria-hidden className="absolute left-[17px] top-10 h-[calc(100%-2.75rem)] border-l-2 border-dashed border-sky/30" />}
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EEF4FC] text-sm font-bold text-sky">{i + 1}</span>
                      <span>
                        <span className="block font-semibold text-asphalt">{s.title}</span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-road">{s.body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Panel>
            </Tile>
          </Reveal>

          <Reveal delay={100} className="h-full">
            <Tile tint="warm">
              <Panel className="flex flex-col">
                <div className="flex items-center justify-between rounded-2xl bg-asphalt px-5 py-4 text-white">
                  <h2 className="font-semibold">What a plan can cover</h2>
                  <span aria-hidden className="text-line">{icon("M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3zM9 12l2 2 4-4")}</span>
                </div>
                <p className="mt-6 text-3xl font-extrabold leading-tight text-asphalt">The parts that cost the most to fix</p>
                <p className="mt-3 leading-relaxed text-road">
                  A vehicle service contract pays for covered mechanical and electrical failures after your factory warranty ends. Choose the level of coverage that fits your car and your budget.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {COVERED.map((c) => (
                    <li key={c} className="rounded-full bg-[#F3F6FA] px-4 py-2 text-sm font-medium text-asphalt">{c}</li>
                  ))}
                </ul>
                <p className="mt-auto pt-5 text-xs text-road/80">What&apos;s covered depends on the plan you choose. <Link href="/repair-costs" className="font-semibold text-sky hover:underline">See typical repair costs</Link>.</p>
              </Panel>
            </Tile>
          </Reveal>

          <Reveal delay={200} className="h-full">
            <Tile>
              <Panel className="flex flex-col items-center text-center">
                <span aria-hidden className="grid h-20 w-20 place-items-center rounded-full bg-[radial-gradient(circle,#FFFFFF_0%,#EEF4FC_100%)] text-sky shadow-[0_10px_30px_rgba(31,95,173,0.15)]">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
                </span>
                <h2 className="mt-6 text-xl font-bold text-asphalt">Real people, real answers</h2>
                <p className="mt-2 leading-relaxed text-road">Talk to a licensed agent who explains your options in plain English. No pressure, no obligation.</p>
                <a href={biz.phoneHref} className="mt-6 text-2xl font-extrabold tracking-tight text-asphalt hover:text-sky">{biz.phone}</a>
                <div className="mt-auto w-full pt-6">
                  <Link href="/quote/auto" className="btn-primary w-full bg-line text-asphalt hover:bg-[#E3B21F]">Get my free quote</Link>
                </div>
              </Panel>
            </Tile>
          </Reveal>
        </div>
      </section>

      {/* Helpful, search-friendly explainer with links to related pages */}
      <section className="bg-[#F7F9FC]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:gap-14 md:py-20">
          <Reveal>
            <h2 className="text-3xl font-extrabold leading-tight text-asphalt sm:text-4xl">Extended car warranty or car insurance: what&apos;s the difference?</h2>
          </Reveal>
          <Reveal delay={100} className="space-y-4 text-[17px] leading-relaxed text-road">
            <p>
              <strong className="text-asphalt">Car insurance</strong> pays after an accident, theft or weather damage, and most states require it. An <strong className="text-asphalt">extended car warranty</strong>, also called a vehicle service contract, pays when a covered part breaks down on its own, such as an engine, transmission or A/C failure.
            </p>
            <p>
              Many drivers carry both: insurance for the unexpected on the road, and repair coverage for the bills that come with age and mileage. {site.name} helps you compare options for each in one place.
            </p>
            <p>
              Have questions? Read our <Link href="/faq" className="font-semibold text-sky underline-offset-2 hover:underline">frequently asked questions</Link>, check <Link href="/repair-costs" className="font-semibold text-sky underline-offset-2 hover:underline">what common repairs cost</Link>, or browse helpful guides on the <Link href="/blog" className="font-semibold text-sky underline-offset-2 hover:underline">{site.name} blog</Link>.
            </p>
          </Reveal>
        </div>
      </section>

      <CustomerReviews />
      <QuoteBanner />
    </>
  );
}
