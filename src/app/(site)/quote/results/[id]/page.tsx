import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { VSC_DISCLOSURE } from "@/lib/products";
import { getSettings, getSite } from "@/lib/settings";
import { estimatePlans } from "@/lib/vsc-pricing";

export const metadata = { title: "Your plan prices", robots: { index: false } };
export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [biz, { results }] = await Promise.all([getSite(), getSettings()]);
  const { id } = await params;
  // Only non-sensitive fields are loaded here: this page is reachable by its link.
  const lead = await db.lead.findUnique({
    where: { id },
    select: { firstName: true, line: true, coverageLevel: true, vehicles: { select: { year: true, make: true, model: true, mileage: true } } },
  });
  if (!lead) notFound();

  const v = lead.vehicles[0];
  const plans = lead.line === "vsc" && v ? estimatePlans(v) : [];
  const car = v ? `${v.year} ${titleCase(v.make)} ${v.model}` : "your car";

  if (plans.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div aria-hidden className="lane h-2 w-24 rounded" />
        <h1 className="mt-6 text-3xl font-bold">Thanks, {lead.firstName}. We&apos;ll call you shortly.</h1>
        <p className="mt-4 text-lg leading-relaxed text-road">
          We couldn&apos;t show online prices for your {car}, but a member of our team can still find the plans it qualifies for and go over the prices with you.
        </p>
        <p className="mt-3 leading-relaxed text-road">There&apos;s no obligation to buy, and every plan comes with a 30-day money-back guarantee.</p>
        <a href={biz.phoneHref} className="btn-primary mt-8">Call now: {biz.phone}</a>
      </div>
    );
  }

  // The plan the person picked is highlighted; otherwise the most complete plan the car qualifies for.
  const chosen = plans.find((p) => p.key === lead.coverageLevel)?.key;
  const highlighted = chosen ?? plans[plans.length - 1].key;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-3xl font-bold">{lead.firstName}, here are your plan prices</h1>
      <p className="mt-2 text-road">Estimated monthly prices for your {car}. Call us to lock in your price and choose your term and deductible.</p>
      {results.disclaimer && (
        <p className="mt-5 rounded-lg border border-rail border-l-4 border-l-line bg-white p-4 text-sm leading-relaxed text-road">{results.disclaimer}</p>
      )}

      <ol className="mt-8 grid gap-5 md:grid-cols-3">
        {plans.map((p) => {
          const top = p.key === highlighted;
          return (
            <li key={p.key} className={`flex flex-col rounded-2xl border bg-white p-6 ${top ? "border-asphalt shadow-[inset_0_4px_0_#F2C230]" : "border-rail"}`}>
              {top && <p className="text-sm font-semibold text-sky">{chosen ? "Your choice" : "Most protection for your car"}</p>}
              <h2 className="mt-1 text-xl font-bold">{p.name}</h2>
              <p className="text-sm text-road">{p.tagline}</p>
              <p className="mt-4 text-3xl font-bold">
                ${p.low}–${p.high}
                <span className="text-base font-medium text-road">/mo</span>
              </p>
              <p className="text-xs text-road">Estimated</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.includes.map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky/10 text-sky">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
              <a href={biz.phoneHref} className={`btn-primary mt-6 justify-center ${top ? "bg-line text-asphalt hover:bg-[#E3B21F]" : ""}`}>
                Call to get this plan
              </a>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 rounded-2xl bg-[linear-gradient(135deg,#0B2F5B_0%,#1F5FAD_100%)] p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-lg font-bold">Ready to choose? Call {biz.phone}</p>
          <p className="mt-1 text-sm text-white/80">We&apos;ll confirm your exact price, and every plan comes with a 30-day money-back guarantee.</p>
        </div>
        <a href={biz.phoneHref} className="mt-4 inline-flex shrink-0 rounded-lg bg-white px-5 py-3 font-semibold text-asphalt hover:bg-white/90 sm:mt-0">Call now</a>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-road">
        Plans typically include the parts listed above; the exact parts, exclusions, term and deductible are in each contract. {VSC_DISCLOSURE}
      </p>
    </div>
  );
}
