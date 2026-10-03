import { QuoteForm } from "@/components/QuoteForm";
import { ogMetadata } from "@/lib/og";
import { getSite } from "@/lib/settings";
import { jsonLd } from "@/lib/security";
import { site } from "@/lib/site";

export const metadata = {
  title: "Get a Free Car Insurance Quote",
  description: "Answer a few quick questions about your car and driving to compare car insurance quotes from multiple companies. Free, with no obligation to buy.",
  alternates: { canonical: "/quote/auto" },
  ...ogMetadata(
    {
      eyebrow: "Free quote",
      title: "Get your car insurance quote in minutes",
      subtitle: "Compare prices from several insurance companies with one quick form.",
      image: "/images/cta-car.webp",
    },
    { url: "/quote/auto", title: `Get a Free Car Insurance Quote | ${site.name}` },
  ),
};

export default async function AutoQuotePage({ searchParams }: { searchParams: Promise<{ zip?: string }> }) {
  const biz = await getSite();
  // Tells search engines what this page offers and who provides it.
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Car insurance quote comparison",
    serviceType: "Car insurance",
    description: "Compare car insurance quotes from several insurance companies with one free form.",
    url: site.url + "/quote/auto",
    provider: { "@id": site.url + "/#organization" },
    areaServed: { "@type": "Country", name: "United States" },
  };
  const { zip } = await searchParams;
  const initialZip = /^\d{5}$/.test(zip ?? "") ? zip! : "";
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <QuoteForm initialZip={initialZip} consentText={biz.consentText} consentVersion={biz.consentVersion} phone={biz.phone} phoneHref={biz.phoneHref} />
    </div>
  );
}
