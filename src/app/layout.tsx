import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

// Pages render on request (settings come from the database, cached in getSettings), so the
// Docker image can be built without a database and always shows the live admin settings.
export const dynamic = "force-dynamic";

// Defaults come from site.ts; the SEO and verification fields in /admin/settings override them.
export async function generateMetadata(): Promise<Metadata> {
  const { seo, verification } = await getSettings();
  const title = seo.title || `Car Insurance Quotes & Vehicle Service Contracts | ${site.name}`;
  const description = seo.description || site.description;
  const other: Record<string, string> = {};
  if (verification.bing) other["msvalidate.01"] = verification.bing;
  if (verification.meta) other["facebook-domain-verification"] = verification.meta;
  return {
    metadataBase: new URL(site.url),
    title: { default: title, template: `%s | ${site.name}` },
    description,
    applicationName: site.name,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: site.name, locale: "en_US", url: "/", title, description },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    verification: { google: verification.google || undefined, yandex: verification.yandex || undefined, other },
    formatDetection: { telephone: false, email: false, address: false },
    category: "insurance",
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#262A30" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
