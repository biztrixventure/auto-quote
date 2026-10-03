import { VscQuoteForm } from "@/components/VscQuoteForm";
import { ogMetadata } from "@/lib/og";
import { getSite } from "@/lib/settings";
import { jsonLd } from "@/lib/security";
import { site } from "@/lib/site";

export const metadata = {
  title: "Vehicle Service Contract Quote",
  description: "Get a free quote on a vehicle service contract that helps pay for costly car repairs after your factory warranty ends. Tell us about your car; no obligation.",
  alternates: { canonical: "/quote/vehicle-protection" },
  ...ogMetadata(
    {
      eyebrow: "Vehicle service contract",
      title: "Get a quote to help with repair bills",
      subtitle: "Plan options and prices for your car. Free, no obligation.",
      image: "/images/cta-car.webp",
    },
    { url: "/quote/vehicle-protection", title: `Vehicle Service Contract Quote | ${site.name}` },
  ),
};

export default async function VehicleProtectionQuotePage() {
  const biz = await getSite();
  // Tells search engines what this page offers and who provides it.
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Vehicle service contract quotes",
    serviceType: "Vehicle service contract",
    description: "Free quotes on vehicle service contracts that help pay for car repairs. A vehicle service contract is not insurance.",
    url: site.url + "/quote/vehicle-protection",
    provider: { "@id": site.url + "/#organization" },
    areaServed: { "@type": "Country", name: "United States" },
  };
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <VscQuoteForm consentText={biz.vscConsentText} consentVersion={biz.vscConsentVersion} phone={biz.phone} phoneHref={biz.phoneHref} />
    </div>
  );
}
