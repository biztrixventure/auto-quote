import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, QuoteBanner, RepairCostsSection } from "@/components/sections";
import { ogMetadata } from "@/lib/og";
import { jsonLd } from "@/lib/security";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

const title = "Car Repair Costs";
const description = "Average car repair costs for 18 common repairs, from catalytic converters to transmissions, what drives the price, and how to plan for unexpected repair bills.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/repair-costs" },
  ...ogMetadata({ eyebrow: "Repair costs", title: "What would your next repair cost?", subtitle: description }, { url: "/repair-costs", title: `${title} | ${site.name}`, description }),
};

// Most common check engine light repairs and their average cost (parts and labor), from the
// 2026 CarMD Vehicle Health Index, which covers repairs made in 2025. Update yearly.
const CARMD_URL = "https://www.carpro.com/blog/annual-carmd-check-engine-light-report-catalytic-converter-tops-list";
const CARMD_AVERAGE = "$554";
const CARMD_REPAIRS: [string, string][] = [
  ["Catalytic converter replacement", "$1,511"],
  ["Fuel injector(s)", "$572"],
  ["Ignition coil and spark plug(s)", "$480"],
  ["Mass air flow (MAF) sensor replacement", "$346"],
  ["Thermostat", "$324"],
  ["ABS wheel speed sensor", "$314"],
  ["Spark plug(s)", "$299"],
  ["Oxygen (O2) sensor", "$287"],
  ["Ignition coil", "$256"],
  ["EVAP canister purge control valve", "$172"],
];

const FAQS = [
  {
    q: "What is the average cost of a car repair?",
    a: `It depends on the repair. CarMD's 2026 Vehicle Health Index found the average check engine light repair cost a record ${CARMD_AVERAGE} in 2025, while major mechanical repairs such as a transmission (around $3,000) or an engine cylinder head (around $7,500) cost far more.`,
  },
  {
    q: "What is the most expensive car repair?",
    a: "Engine and transmission work are usually the most expensive. An engine cylinder head job can reach around $7,500 and a transmission repair averages about $3,000. Among check engine light repairs, a catalytic converter averaged $1,511 in CarMD's latest data.",
  },
  {
    q: "Does car insurance pay for repairs like these?",
    a: "Not when a part wears out or breaks down on its own. Car insurance pays for damage from accidents, theft and weather. Mechanical breakdowns are paid out of pocket, or by a separate plan such as a vehicle service contract, depending on its terms.",
  },
  {
    q: "Why are car repairs getting more expensive?",
    a: "CarMD reports that labor costs rose 51% and parts costs rose 23% in its 2025 data, driven by more complex systems, multi-part repairs and, in some cases, tariffs on imported parts. The average US vehicle is also older, at 12.8 years.",
  },
  {
    q: "How can I lower my repair costs?",
    a: "Keep up with routine maintenance, have warning lights checked early before a small problem damages other parts, and get a second written estimate for any large repair.",
  },
];

export default async function RepairCostsPage() {
  const { content } = await getSettings();
  const major = Object.entries(content.repairCosts);
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PageHero
        eyebrow="Repair costs"
        title="What Would Your Next Repair Cost?"
        intro="Select any part of the car below to see what a typical repair costs out of pocket, then compare average costs for 18 common repairs."
        crumbs={[{ name: "Repair costs", href: "/repair-costs" }]}
      />
      <RepairCostsSection costs={content.repairCosts} bare />

      <section className="mx-auto max-w-4xl px-5 pb-6">
        <div className="post-content">
          <h2>Average car repair costs</h2>
          <p>
            <strong>Most common check engine light repairs cost a few hundred dollars, but major mechanical repairs can run into the thousands.</strong> The
            tables below show typical out-of-pocket costs, including parts and labor. Your price will depend on your vehicle, where you live and the shop you use.
          </p>

          <h3>Major mechanical repairs</h3>
          <table>
            <thead><tr><th>Repair</th><th>Typical cost</th></tr></thead>
            <tbody>
              {major.map(([part, cost]) => (
                <tr key={part}><td>{part}</td><td>{cost}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm">Estimates based on <a href="https://www.consumeraffairs.com/">ConsumerAffairs</a> data. Costs vary by vehicle, location and repair facility.</p>

          <h3>Most common check engine light repairs</h3>
          <p>
            CarMD&apos;s 2026 Vehicle Health Index, based on repairs reported by a nationwide network of ASE-certified technicians, found the average check
            engine light repair cost a record <strong>{CARMD_AVERAGE} in 2025</strong>. These were the ten most common repairs:
          </p>
          <table>
            <thead><tr><th>Repair</th><th>Average cost (parts and labor)</th></tr></thead>
            <tbody>
              {CARMD_REPAIRS.map(([repair, cost]) => (
                <tr key={repair}><td>{repair}</td><td>{cost}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm">Source: 2026 CarMD Vehicle Health Index (2025 repair data), as <a href={CARMD_URL}>reported by CarPro</a>.</p>

          <h2>What affects the cost of a car repair?</h2>
          <p>
            Two things make up most repair bills: parts and labor. Labor is the shop&apos;s hourly rate multiplied by the time the job takes, which is why repairs
            that require removing other components, such as many transmission and engine jobs, cost far more than the parts alone suggest.
          </p>
          <p>
            Your vehicle matters too. Parts for luxury and European models usually cost more, and newer cars with complex electronics and safety sensors take
            longer to diagnose and calibrate. Shop type and location also change the price: dealership rates tend to be higher than independent shops, and
            labor rates vary from city to city.
          </p>

          <h2>The most expensive car repairs</h2>
          <p>
            Engine and transmission work sit at the top. An engine cylinder head repair can reach around $7,500, and a transmission repair averages about
            $3,000. These are the bills that are hardest to plan for, because they often arrive without warning on cars that are past their factory warranty.
            Among check engine light repairs, the catalytic converter is the most expensive at an average of $1,511, and CarMD notes it is often damaged by
            smaller problems, such as misfires or a failing oxygen sensor, that were left unrepaired.
          </p>

          <h2>How to keep repair costs down</h2>
          <p>
            The cheapest repair is the one you catch early. Follow your vehicle&apos;s maintenance schedule, have a warning light checked promptly instead of
            driving on it, and get a second written estimate for any repair over a few hundred dollars. Keeping records of your maintenance also helps if you
            ever need to make a claim on a warranty or service contract.
          </p>

          <h2>How to pay for an unexpected repair</h2>
          <p>
            Car insurance won&apos;t help here: it pays for damage from accidents, theft and weather, not for parts that wear out or fail on their own.
          </p>
          <p>
            Many drivers set aside an emergency repair fund. Others choose a <strong>vehicle service contract</strong>, an optional contract (not insurance) that
            may pay for eligible repairs to the parts it lists, depending on its terms, exclusions and deductible. Whether one makes sense depends on your car and
            budget, which we break down in <Link href="/blog/are-extended-car-warranties-worth-it">are extended car warranties worth it?</Link> and, for older cars,
            in our guide to <Link href="/blog/extended-warranty-for-used-cars">extended warranties for used cars</Link>.
          </p>
          <p>
            Want to compare a plan&apos;s price with the repair costs above? <Link href="/quote/vehicle-protection">Get a free vehicle service contract quote</Link>.
          </p>

          <h2>Frequently asked questions</h2>
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p className="text-sm">Last updated October 2026. Costs are averages and estimates, not quotes for your vehicle.</p>
        </div>
      </section>

      <QuoteBanner />
    </>
  );
}
