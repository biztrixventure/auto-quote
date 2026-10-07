import { Analytics } from "@/components/Analytics";
import { visitorOptedOut } from "@/lib/legal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackingCapture } from "@/components/TrackingCapture";
import { getSettings, getSite } from "@/lib/settings";
import { jsonLd } from "@/lib/security";
import { site } from "@/lib/site";

// Tells search engines who runs the site and how to reach them.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const biz = await getSite();
    const phone = biz.phoneHref.replace("tel:", "");
  const organizationSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        // A plain Organization: vehicle service contracts are not insurance, so an InsuranceAgency
        // type would be misleading.
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        alternateName: "VertexAutoCare",
        legalName: biz.agencyLegalName,
        url: `${site.url}/`,
        logo: { "@type": "ImageObject", url: `${site.url}/brand/logo-512.png`, width: 512, height: 512 },
        image: `${site.url}/opengraph-image`,
        description: site.description,
        telephone: phone,
        email: biz.email,
        areaServed: { "@type": "Country", name: "United States" },
        contactPoint: { "@type": "ContactPoint", telephone: phone, contactType: "customer service", areaServed: "US", availableLanguage: "English" },
        // Official profiles on other sites: how Google ties the brand to its knowledge panel.
        ...(site.sameAs.length ? { sameAs: site.sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: `${site.url}/`,
        // Google uses these to show "Vertex AutoCare" as the site name in search results.
        name: site.name,
        alternateName: ["VertexAutoCare", "vertexautocare.com"],
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };

  // Public website chrome. The admin area has its own layout.
  const { tracking, legal } = await getSettings();
  const optedOut = await visitorOptedOut(legal.honorGpc);
  return (
    <>
      <Analytics {...tracking} optedOut={optedOut} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema) }} />
      <TrackingCapture />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
