import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, QuoteBanner } from "@/components/sections";
import { ogMetadata } from "@/lib/og";
import { VSC_DISCLOSURE } from "@/lib/products";
import { jsonLd } from "@/lib/security";
import { getSite } from "@/lib/settings";
import { site } from "@/lib/site";
import { estimatePlans } from "@/lib/vsc-pricing";

// Pillar page for "extended car warranty" / "car warranty" / "vehicle service contract":
// what it is, the plan levels, what they cost, what's covered, how it works. Blog posts on
// single topics (powertrain, bumper-to-bumper, used cars, cost) link back here.

const title = "Extended Car Warranty: Plans, Prices and What's Covered";
const description =
  "How an extended car warranty (vehicle service contract) works, what powertrain to complete plans cover, what they cost and what's excluded. Free quote, 30-day money-back guarantee.";
const PATH = "/extended-car-warranty";
const FTC_URL = "https://consumer.ftc.gov/articles/auto-warranties-and-auto-service-contracts";

export const metadata: Metadata = {
  title: { absolute: `Extended Car Warranty: Plans, Prices & Coverage | ${site.name}` },
  description,
  alternates: { canonical: PATH },
  ...ogMetadata(
    { eyebrow: "Extended car warranty", title: "Plans, prices and what's covered", subtitle: "Powertrain to complete protection for the repairs that cost the most." },
    { url: PATH, title: `Extended Car Warranty | ${site.name}`, description },
  ),
};

// Example prices: a typical car about five years old with 50,000 to 75,000 miles.
const EXAMPLE = estimatePlans({ year: new Date().getFullYear() - 5, make: "CHEVROLET", mileage: 75000 });

const FAQS = [
  {
    q: "Is an extended car warranty the same as a vehicle service contract?",
    a: "Yes, in everyday use. What most people call an extended car warranty is legally a vehicle service contract: an optional contract you buy separately that pays for covered repairs. The Federal Trade Commission notes it isn't a warranty as defined by federal law, because a warranty comes with the car.",
  },
  {
    q: "How much does an extended car warranty cost?",
    a: "Most plans cost several hundred to a few thousand dollars in total, depending on the car's age, mileage, make and model, the plan level, the term and the deductible. Many people pay monthly. Our free quote shows estimated prices for your car.",
  },
  {
    q: "What does an extended car warranty cover?",
    a: "It depends on the plan. Powertrain plans cover the engine, transmission and drive parts; mid-level plans add systems such as air conditioning, brakes, steering and electrical; the most complete plans cover most mechanical and electrical parts and list exclusions instead. Repairs are paid only for parts the contract covers, subject to its terms and deductible.",
  },
  {
    q: "What isn't covered by an extended car warranty?",
    a: "Routine maintenance, parts that wear out with normal use such as brake pads, tires and wiper blades, damage from accidents or misuse, and problems that existed before the contract started are usually excluded. Each contract lists its own exclusions.",
  },
  {
    q: "Can I buy an extended car warranty after my factory warranty ends?",
    a: "Yes. You can buy a vehicle service contract at any time, not only when you buy the car, as long as the car is in good working condition. Buying before the factory warranty ends can give you more plan choices.",
  },
  {
    q: "Can I cancel an extended car warranty?",
    a: `Yes. Every plan ${site.name} sells comes with a 30-day money-back guarantee: cancel within 30 days of purchase for a full refund, as long as no claims have been filed. After that, you can usually cancel for a prorated refund under the terms of your contract.`,
  },
];

export default async function ExtendedCarWarrantyPage() {
  const biz = await getSite();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${site.url}${PATH}#service`,
        name: "Extended car warranty (vehicle service contract)",
        serviceType: "Vehicle service contract",
        category: "Vehicle service contract (not insurance)",
        description,
        url: `${site.url}${PATH}`,
        provider: { "@id": `${site.url}/#organization` },
        areaServed: { "@type": "Country", name: "United States" },
        offers: EXAMPLE.map((p) => ({
          "@type": "Offer",
          name: p.name,
          priceCurrency: "USD",
          priceSpecification: { "@type": "UnitPriceSpecification", minPrice: p.low, maxPrice: p.high, priceCurrency: "USD", unitText: "MONTH" },
          url: `${site.url}/quote/vehicle-protection`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PageHero
        eyebrow="Extended car warranty"
        title={title}
        intro="An extended car warranty helps pay for engine, transmission and other major repairs after your factory warranty ends. Here's how the plans differ, what they cost and what they don't cover."
        crumbs={[{ name: "Extended car warranty", href: PATH }]}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/quote/vehicle-protection" className="btn-primary bg-line text-asphalt hover:bg-[#E3B21F]">See plan prices for my car</Link>
          <a href={biz.phoneHref} className="btn-secondary">Call {biz.phone}</a>
        </div>
      </PageHero>

      <section className="mx-auto max-w-4xl px-5 py-12">
        <div className="post-content">
          <p>
            <strong>
              An extended car warranty, legally called a vehicle service contract, is an optional plan that pays for covered repairs when a part breaks down
              after your factory warranty ends.
            </strong>{" "}
            You choose how much of the car it protects, from the powertrain only to most mechanical and electrical parts, and you pay a monthly or one-time
            price plus a deductible when you use it. It is not car insurance: insurance pays after accidents, theft or weather, while a service contract pays
            when covered parts fail on their own.
          </p>
          <p>
            {site.name} offers three plan levels backed and administered by established providers. You can{" "}
            <Link href="/quote/vehicle-protection">see estimated prices for your car</Link> in a few minutes, and every plan comes with a 30-day money-back
            guarantee.
          </p>

          <h2>What is an extended car warranty?</h2>
          <p>
            Every new car comes with a factory warranty for a set number of years or miles. When it runs out, repairs come out of your pocket. An extended car
            warranty picks up where it left off. The contract lists the parts it covers, how long it lasts, the deductible you pay per repair visit and the
            situations it excludes.
          </p>
          <p>
            Strictly speaking, it isn&apos;t a warranty. The <a href={FTC_URL}>Federal Trade Commission</a> explains that an auto service contract, sometimes
            called an extended warranty, isn&apos;t a warranty as defined by federal law, because you buy it separately instead of getting it with the car. That is
            why the contracts themselves use the name vehicle service contract. Many are handled by a company called an administrator, which approves and pays
            claims.
          </p>

          <h2>Extended car warranty plans compared</h2>
          <p>
            Plans are sold in levels. The more of the car a plan covers, the more it costs. The prices below are estimates for a typical car about five years old
            with 50,000 to 75,000 miles; older, higher-mileage and luxury cars cost more.
          </p>
          <table>
            <thead>
              <tr><th>Plan</th><th>What it covers</th><th>Good fit for</th><th>Estimated price</th></tr>
            </thead>
            <tbody>
              {EXAMPLE.map((p) => (
                <tr key={p.key}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.includes.join(", ")}</td>
                  <td>
                    {p.key === "powertrain" && "Older or higher-mileage cars, and drivers who want protection from the biggest repair bills at the lowest price"}
                    {p.key === "plus" && "Most drivers: the expensive powertrain parts plus the systems that fail most often as a car ages"}
                    {p.key === "complete" && "Newer cars leaving their factory warranty, and cars with costly electronics"}
                  </td>
                  <td>${p.low}–${p.high}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm">Estimates, not offers. Your price depends on your car, its mileage and condition, the term and the deductible you choose.</p>

          <h3>Powertrain plans</h3>
          <p>
            A powertrain plan covers the parts that make the car go: the engine, transmission and drive axles. These are the most expensive repairs a car can
            need. A transmission repair averages about $3,000 and engine work can cost far more, so a powertrain plan targets the bills that hurt most.
          </p>
          <h3>Mid-level plans</h3>
          <p>
            Mid-level plans keep the powertrain coverage and add named systems such as air conditioning, cooling, brakes, steering, fuel and electrical parts.
            They list exactly which parts are included, so anything not on the list is not covered.
          </p>
          <h3>Complete (exclusionary) plans</h3>
          <p>
            The most complete plans work the other way around: they cover most mechanical and electrical parts and list only what is excluded. They are the
            closest thing to a factory bumper-to-bumper warranty and usually have the strictest age and mileage limits.
          </p>

          <h2>How much does an extended car warranty cost?</h2>
          <p>
            <strong>The FTC says prices can range from several hundred dollars to several thousand.</strong> Most people pay monthly. Five things set the price:
          </p>
          <ol>
            <li><strong>Your car&apos;s make and model.</strong> Brands with costly parts and labor cost more to cover.</li>
            <li><strong>Age and mileage.</strong> Older, higher-mileage cars are more likely to need repairs.</li>
            <li><strong>Plan level.</strong> Complete plans cost more than powertrain plans.</li>
            <li><strong>Term.</strong> A longer contract costs more in total.</li>
            <li><strong>Deductible.</strong> A higher deductible per repair visit lowers the price.</li>
          </ol>
          <p>
            To decide whether a plan makes sense, compare its total cost with what a repair would cost you. Our{" "}
            <Link href="/repair-costs">car repair cost guide</Link> shows typical prices, and{" "}
            <Link href="/blog/are-extended-car-warranties-worth-it">are extended car warranties worth it?</Link> walks through the math.
          </p>

          <h2>What an extended car warranty doesn&apos;t cover</h2>
          <p>
            Few contracts cover everything. The FTC warns that a contract covering only &quot;mechanical breakdowns&quot; may not cover problems caused by normal
            wear and tear. Read the exclusions before you buy. Most contracts exclude:
          </p>
          <ul>
            <li>Routine maintenance such as oil changes, filters and tire rotations</li>
            <li>Parts that wear out with normal use, such as brake pads, tires, wiper blades and batteries</li>
            <li>Damage from accidents, weather, misuse or lack of maintenance</li>
            <li>Problems that existed before the contract started</li>
          </ul>
          <p>Keep your maintenance records. Contracts usually require you to maintain the car as the manufacturer recommends.</p>

          <h2>How an extended car warranty works</h2>
          <p>
            You choose a plan, a term and a deductible, and the contract starts after any waiting period it lists. When a covered part fails, you take the car to
            a repair facility allowed by your contract, the shop diagnoses the problem, and the administrator approves the repair before work begins. You pay the
            deductible, and the contract pays for the covered parts and labor.
          </p>
          <p>
            Ask any company you&apos;re considering who administers the contract, which repair shops you can use, whether repairs need pre-approval, and how
            cancellation works. The FTC also warns about extended warranty scams that pressure you for payment before showing the contract, so never pay
            before you&apos;ve seen the full terms.
          </p>

          <h2>Extended warranties for used and high-mileage cars</h2>
          <p>
            You can buy a plan for a used car, and that&apos;s often when it matters most, because the factory warranty may already be gone. Plan choices narrow as
            mileage rises: complete plans usually stop at lower mileage, while powertrain plans remain available for older cars. Our guide to{" "}
            <Link href="/blog/extended-warranty-for-used-cars">extended warranties for used cars</Link> covers what to check before you buy.
          </p>

          <h2>Our 30-day money-back guarantee</h2>
          <p>
            Every plan {site.name} sells comes with a 30-day money-back guarantee. If you change your mind, cancel within 30 days of purchase for a full refund,
            as long as no claims have been filed. After that, cancellation and any prorated refund follow the terms of your contract.
          </p>
          <p>
            Ready to see what a plan would cost for your car? <Link href="/quote/vehicle-protection">Get your free quote</Link> or call{" "}
            <a href={biz.phoneHref}>{biz.phone}</a>.
          </p>

          <h2>Frequently asked questions</h2>
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p className="text-sm">
            Last updated October 2026. {VSC_DISCLOSURE} Sources: <a href={FTC_URL}>Federal Trade Commission</a>; repair costs from our{" "}
            <Link href="/repair-costs">car repair cost guide</Link>.
          </p>
        </div>
      </section>

      <QuoteBanner />
    </>
  );
}
