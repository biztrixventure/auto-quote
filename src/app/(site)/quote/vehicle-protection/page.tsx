import Link from "next/link";
import { VscQuoteForm } from "@/components/VscQuoteForm";
import { ogMetadata } from "@/lib/og";
import { getSite } from "@/lib/settings";
import { jsonLd } from "@/lib/security";
import { site } from "@/lib/site";

export const metadata = {
  title: "Extended Car Warranty Quote: See Plan Prices in 2 Minutes",
  description: "Get a free extended car warranty (vehicle service contract) quote. See estimated prices for powertrain to complete plans for your car. 30-day money-back guarantee.",
  alternates: { canonical: "/quote/vehicle-protection" },
  ...ogMetadata(
    {
      eyebrow: "Extended car warranty",
      title: "See plan prices for your car",
      subtitle: "Powertrain to complete protection. Free quote, 30-day money-back guarantee.",
      image: "/images/cta-car.webp",
    },
    { url: "/quote/vehicle-protection", title: `Extended Car Warranty Quote | ${site.name}` },
  ),
};

export default async function VehicleProtectionQuotePage({ searchParams }: { searchParams: Promise<{ zip?: string }> }) {
  const [biz, { zip }] = await Promise.all([getSite(), searchParams]);
  const initialZip = /^\d{5}$/.test(zip ?? "") ? zip! : "";
  // Tells search engines what this page offers and who provides it.
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": site.url + "/quote/vehicle-protection#service",
    category: "Vehicle service contract (not insurance)",
    name: "Extended car warranty (vehicle service contract) quotes",
    serviceType: "Vehicle service contract",
    description: "Free quotes on vehicle service contracts, often called extended car warranties, that help pay for car repairs after the factory warranty ends. A vehicle service contract is not insurance.",
    url: site.url + "/quote/vehicle-protection",
    provider: { "@id": site.url + "/#organization" },
    areaServed: { "@type": "Country", name: "United States" },
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
      <VscQuoteForm initialZip={initialZip} consentText={biz.vscConsentText} consentVersion={biz.vscConsentVersion} phone={biz.phone} phoneHref={biz.phoneHref} />

      {/* What searchers want to know before they request a quote. */}
      <section className="post-content mx-auto mt-14 max-w-3xl">
        <h2>How vehicle service contract pricing works</h2>
        <p>
          The price of a vehicle service contract depends mostly on your car and the level of protection you choose. <strong>Older, higher-mileage cars and
          luxury or European models usually cost more</strong>, because they are more likely to need expensive repairs. A higher deductible lowers the price, and
          a longer term costs more in total. Across the market, ConsumerAffairs reports typical annual costs of about $600 to $750 for powertrain plans and
          $1,000 to $1,500 for mid-level plans, with total contract prices often between $2,000 and $4,000 (
          <a href="https://www.consumeraffairs.com/automotive/extended-car-warranty-cost.html">ConsumerAffairs, 2026</a>). Your quote will reflect your
          specific vehicle.
        </p>

        <h2>Common plan levels</h2>
        <table>
          <thead><tr><th>Plan level</th><th>What it generally includes</th></tr></thead>
          <tbody>
            <tr><td>Powertrain</td><td>The engine, transmission and drivetrain, the most expensive parts to repair</td></tr>
            <tr><td>Mid-level</td><td>Powertrain plus major systems such as cooling, brakes, steering and electrical</td></tr>
            <tr><td>Most complete</td><td>Most mechanical and electrical systems, with a list of exclusions instead of inclusions</td></tr>
          </tbody>
        </table>
        <p>The exact parts, exclusions and deductible are listed in each contract, so you can compare plans on what they actually include.</p>

        <h2>What happens after you request a quote</h2>
        <p>
          After you send the form, a member of our team calls you with plan options and prices for your car from the service contract providers we work
          with, and explains each one in plain English. You review the full contract before you decide, and there is no obligation to buy. A vehicle service contract is not insurance; it is an optional contract that may pay
          for eligible repairs depending on its terms.
        </p>
        <h2>30-day money-back guarantee</h2>
        <p>
          If you&apos;re not happy with your vehicle service contract, you can cancel within 30 days of purchase and get a full refund, as long as no claims
          have been filed. After 30 days you can still cancel for a prorated refund, minus any claims paid and fees listed in your contract.
        </p>
        <p>
          Not sure a plan is right for you? Read <Link href="/blog/are-extended-car-warranties-worth-it">are extended car warranties worth it?</Link>, our guide
          to <Link href="/blog/extended-warranty-for-used-cars">extended warranties for used cars</Link>, or <Link href="/repair-costs">see common car repair costs</Link>.
        </p>

        <h2>Frequently asked questions</h2>
        {FAQS.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

const FAQS = [
  {
    q: "How much does a vehicle service contract cost?",
    a: "It depends on your car's age, mileage, make and model, the plan level and the deductible. Typical annual costs across the market run about $600 to $1,500, and your quote is based on your specific vehicle.",
  },
  {
    q: "Is a vehicle service contract the same as car insurance?",
    a: "No. Car insurance pays for damage from accidents, theft and weather. A vehicle service contract is optional and may pay for eligible repairs when a listed part breaks down, depending on the contract's terms.",
  },
  {
    q: "Can I get a quote for an older or high-mileage car?",
    a: "Often, yes. Many plans accept older and higher-mileage cars, as long as the car is in good working condition. Eligibility depends on the plan.",
  },
  {
    q: "Do I have to buy after getting a quote?",
    a: "No. The quote is free with no obligation. You can review the provider's contract terms and decide later.",
  },
  {
    q: "Can I cancel and get my money back?",
    a: "Yes. Every vehicle service contract we sell comes with a 30-day money-back guarantee: cancel within 30 days of purchase for a full refund, as long as no claims have been filed. After that, you can usually cancel for a prorated refund under the terms of your contract.",
  },
];
