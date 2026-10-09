import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSite } from "@/lib/settings";

export const metadata = { title: "Thanks for your request", robots: { index: false } };
export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Shown after the quote form. No prices online: a member of the team calls with plan options and
// prices, and the visitor can call right away.
export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const biz = await getSite();
  const { id } = await params;
  // Only non-sensitive fields are loaded here: this page is reachable by its link.
  const lead = await db.lead.findUnique({ where: { id }, select: { firstName: true, vehicles: { select: { year: true, make: true, model: true } } } });
  if (!lead) notFound();
  const v = lead.vehicles[0];
  const car = v ? `${v.year} ${titleCase(v.make)} ${v.model}` : "car";

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center">
      <span aria-hidden className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Thanks, {lead.firstName}. We&apos;ll contact you soon.</h1>
      <p className="mt-4 text-lg leading-relaxed text-road">
        A member of our team will call you shortly with plan options and prices for your {car}, and answer any questions you have.
      </p>
      <div className="mt-8 rounded-2xl bg-[linear-gradient(135deg,#0B2F5B_0%,#1F5FAD_100%)] p-7 text-white">
        <p className="text-lg font-bold">Don&apos;t want to wait? Call us now.</p>
        <a href={biz.phoneHref} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-xl font-extrabold text-asphalt transition hover:bg-white/90">
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
          {biz.phone}
        </a>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-road">Free quote, no obligation to buy, and every plan comes with a 30-day money-back guarantee.</p>
    </div>
  );
}
