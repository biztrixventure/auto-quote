import Link from "next/link";
import { getSite } from "@/lib/settings";
import { site } from "@/lib/site";



export async function SiteFooter() {
  const s = await getSite();
  const columns = [
    {
      heading: "Get covered",
      links: [
        { label: "Get a free quote", href: "/quote/auto" },
        { label: "Repair costs", href: "/#repair-costs" },
        { label: "Why choose us", href: "/#why-choose" },
        { label: "FAQ", href: "/#faq" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      heading: "Contact",
      className: "col-span-2 sm:col-span-1",
      links: [
        { label: s.phone, href: s.phoneHref },
        { label: s.email, href: `mailto:${s.email}` },
      ],
    },
    {
      heading: "Policies",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
        { label: "Do not sell or share my personal information", href: "/privacy#do-not-sell" },
      ],
    },
  ];
  return (
    <footer className="mt-24 overflow-hidden border-t border-rail bg-white text-asphalt">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-14 lg:grid-cols-[1.2fr_2fr] lg:gap-16">
        <div className="max-w-sm space-y-3 text-[13px] leading-relaxed text-road">
          <Link href="/" aria-label={`${site.name} home`} className="mb-5 inline-block">
            <img src="/brand/logo.webp" alt={site.name} width={720} height={169} loading="lazy" decoding="async" className="h-11 w-auto" />
          </Link>
          <p>{s.licenseNote}</p>
          <p>Quotes are estimates until the insurance company completes underwriting.</p>
          <p>
            © {new Date().getFullYear()} {s.agencyLegalName}. All rights reserved.
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.heading} className={"className" in col ? col.className : undefined}>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-road/70">{col.heading}</p>
              <ul className="mt-3 space-y-2 text-[15px]">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition hover:text-sky">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Wordmark stretched to the full width with SVG so it scales with the screen. */}
      <div aria-hidden className="mx-auto mt-14 max-w-[1600px] px-5 pb-6 sm:pb-8">
        <svg viewBox="0 0 1000 96" className="block h-auto w-full">
          <text x="0" y="86" textLength="1000" lengthAdjust="spacing" fontSize="92" fontWeight="800" fill="currentColor">
            {site.name.toUpperCase()}
          </text>
        </svg>
      </div>
    </footer>
  );
}
