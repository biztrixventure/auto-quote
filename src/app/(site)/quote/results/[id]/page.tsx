import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

export const metadata = { title: "Your quotes", robots: { index: false } };
export const dynamic = "force-dynamic";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const biz = await getSite();
  const { id } = await params;
  // Only non-sensitive fields are loaded here: this page is reachable by its link.
  const lead = await db.lead.findUnique({
    where: { id },
    select: {
      firstName: true,
      status: true,
      vehicles: { select: { year: true, make: true, model: true } },
      quotes: { orderBy: { monthlyPremium: "asc" } },
    },
  });
  if (!lead) notFound();

  const v = lead.vehicles[0];
  const [{ results }, partners] = await Promise.all([
    getSettings(),
    db.partner.findMany({
      where: { id: { in: lead.quotes.map((q) => q.carrierReference).filter((x): x is string => !!x) } },
      select: { id: true, logoUrl: true, tagline: true },
    }),
  ]);
  const partnerFor = (ref: string | null) => partners.find((p) => p.id === ref);

  if (lead.quotes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div aria-hidden className="lane h-2 w-24 rounded" />
        <h1 className="mt-6 text-3xl font-bold">Thanks, {lead.firstName}. An agent will call you shortly.</h1>
        <p className="mt-4 text-lg leading-relaxed text-road">
          We couldn&apos;t show online prices for your situation, but a licensed agent can still find you coverage.
          Expect a call from {site.name} or one of our insurance partners.
        </p>
        <a href={biz.phoneHref} className="btn-primary mt-8">Call now: {biz.phone}</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">{lead.firstName}, here are your quotes</h1>
      {v && <p className="mt-2 text-road">For your {v.year} {v.make} {v.model}. Prices are for a {lead.quotes[0].termMonths}-month policy.</p>}
      {results.disclaimer && (
        <p className="mt-5 rounded-lg border border-rail border-l-4 border-l-line bg-white p-4 text-sm leading-relaxed text-road">{results.disclaimer}</p>
      )}

      <ol className="mt-8 space-y-4">
        {lead.quotes.map((q, i) => (
          <li key={q.id} className={`rounded-lg border p-5 sm:p-6 ${i === 0 ? "border-asphalt shadow-[inset_4px_0_0_#F2C230]" : "border-rail"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                {partnerFor(q.carrierReference)?.logoUrl && (
                  <img src={partnerFor(q.carrierReference)!.logoUrl!} alt="" className="h-12 w-20 shrink-0 rounded-md border border-rail bg-white object-contain p-1.5" />
                )}
                <div>
                  {i === 0 && <p className="text-sm font-semibold text-road">Lowest price</p>}
                  <h2 className="text-xl font-bold">{q.carrier}</h2>
                  {partnerFor(q.carrierReference)?.tagline && <p className="text-sm font-medium text-sky">{partnerFor(q.carrierReference)!.tagline}</p>}
                  <p className="mt-1 text-sm text-road">{q.coverageSummary}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-3xl font-bold">{money(q.monthlyPremium)}<span className="text-base font-medium text-road">/mo</span></p>
                <p className="text-sm text-road">{money(q.termPremium)} for {q.termMonths} months</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {q.bindUrl ? (
                <a href={q.bindUrl} className="btn-primary" rel="noopener">Buy this policy online</a>
              ) : (
                <a href={biz.phoneHref} className="btn-primary">Call to buy: {biz.phone}</a>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm leading-relaxed text-road">
        Final price is set by the insurance company after it checks your driving record and other details.
        A licensed agent may reach out to help you finish.
      </p>
    </div>
  );
}
