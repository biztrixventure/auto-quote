import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CustomerReviews } from "@/components/CustomerReviews";
import { Reveal } from "@/components/Reveal";
import { PageHero, QuoteBanner } from "@/components/sections";
import { PRODUCTS } from "@/lib/products";
import { ogMetadata } from "@/lib/og";
import { fillCompany, getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

const title = `Why Choose ${site.name}`;
const description = `Why drivers choose ${site.name} for an extended car warranty: plans from powertrain to complete, prices for your car in minutes, a 30-day money-back guarantee and real people to help.`;

export const metadata: Metadata = {
  title,
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
  { title: "Tell us about your car", body: "Year, make, model and mileage. The quote takes about 2 minutes." },
  { title: "See your prices", body: "Get estimated prices for every plan your car qualifies for, from powertrain to complete." },
  { title: "Talk to our team", body: "A service contract specialist answers your questions and confirms your exact price." },
  { title: "Choose and drive", body: "Pick the plan that fits. Every plan comes with a 30-day money-back guarantee." },
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
                alt={`${site.name} agent explaining vehicle service contract options to a couple at a car dealership`}
                width={1600}
                height={1067}
                fetchPriority="high"
                decoding="async"
                className="relative aspect-[3/2] w-full rounded-[28px] object-cover shadow-[0_24px_60px_rgba(16,24,40,0.18)]"
              />
            </picture>
            <span className="absolute -left-2 top-6 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-asphalt shadow-[0_12px_30px_rgba(16,24,40,0.14)] sm:-left-5">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-line text-asphalt">{icon("M20 6 9 17l-5-5")}</span>
              Real people on the phone
            </span>
            <span className="absolute -right-2 bottom-6 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-asphalt shadow-[0_12px_30px_rgba(16,24,40,0.14)] sm:-right-5">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-asphalt text-line">{icon("M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z")}</span>
              Free, no obligation
            </span>
          </div>
        }
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={PRODUCTS.vsc.quoteHref} className="btn-primary bg-line text-asphalt hover:bg-[#E3B21F]">See plan prices for my car</Link>
          <a href={biz.phoneHref} className="btn-secondary">Call {biz.phone}</a>
        </div>
      </PageHero>

      {/* Reasons (edited in Admin → Content → Why choose us) */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">What sets us apart</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Help from real people</h2>
            <p className="mt-4 text-lg leading-relaxed text-road">
              Extended car warranties can be confusing. Here&apos;s how {site.name} makes choosing one simpler.
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

      {/* How it works · What a plan can include · Talk to us */}
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
                  <h2 className="font-semibold">What a plan can include</h2>
                  <span aria-hidden className="text-line">{icon("M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3zM9 12l2 2 4-4")}</span>
                </div>
                <p className="mt-6 text-3xl font-extrabold leading-tight text-asphalt">The parts that cost the most to fix</p>
                <p className="mt-3 leading-relaxed text-road">
                  A vehicle service contract pays for mechanical and electrical failures of the parts it lists after your factory warranty ends. Choose the plan level that fits your car and your budget.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {COVERED.map((c) => (
                    <li key={c} className="rounded-full bg-[#F3F6FA] px-4 py-2 text-sm font-medium text-asphalt">{c}</li>
                  ))}
                </ul>
                <p className="mt-auto pt-5 text-xs text-road/80">What&apos;s included depends on the contract you choose, including its exclusions and deductible. <Link href="/repair-costs" className="font-semibold text-sky hover:underline">See typical repair costs</Link>.</p>
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
                <p className="mt-2 leading-relaxed text-road">Talk to our team, who explain your options in plain English. No pressure, no obligation.</p>
                <a href={biz.phoneHref} className="mt-6 text-2xl font-extrabold tracking-tight text-asphalt hover:text-sky">{biz.phone}</a>
                <div className="mt-auto w-full pt-6">
                  <Link href={PRODUCTS.vsc.quoteHref} className="btn-primary w-full bg-line text-asphalt hover:bg-[#E3B21F]">Get my free quote</Link>
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
            <h2 className="text-3xl font-extrabold leading-tight text-asphalt sm:text-4xl">Extended car warranty or vehicle service contract: what&apos;s the difference?</h2>
          </Reveal>
          <Reveal delay={100} className="space-y-4 text-[17px] leading-relaxed text-road">
            <p>
              Most people say <strong className="text-asphalt">extended car warranty</strong>, but what you actually buy after the factory warranty ends is a <strong className="text-asphalt">vehicle service contract</strong>: an optional contract that pays when a part it lists breaks down on its own, such as an engine, transmission or A/C failure. Only the carmaker&apos;s original coverage is technically a warranty.
            </p>
            <p>
              A service contract is not car insurance, which pays after accidents, theft or weather. It covers the repair bills that come with age and mileage. Every plan {site.name} sells comes with a 30-day money-back guarantee, so you can review your contract with no risk.
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
