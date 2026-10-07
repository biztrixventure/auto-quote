import Link from "next/link";
import { VSC_DISCLOSURE } from "@/lib/products";
import { getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

const COLS: Record<number, string> = { 1: "sm:grid-cols-2", 2: "sm:grid-cols-3", 3: "sm:grid-cols-4", 4: "sm:grid-cols-3 lg:grid-cols-5" };

// Link columns come from /admin/menus; the Contact column is added from the business details.
export async function SiteFooter() {
  const [s, { navigation: nav }] = await Promise.all([getSite(), getSettings()]);
  const columns = [
    ...nav.footerColumns.map((c) => ({ id: c.id, heading: c.title, links: c.links })),
    {
      id: "contact",
      heading: "Contact",
      links: [
        { id: "phone", label: s.phone, href: s.phoneHref },
        { id: "email", label: s.email, href: `mailto:${s.email}` },
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
          <p>{VSC_DISCLOSURE}</p>
          <p>
            © {new Date().getFullYear()} {s.agencyLegalName}. All rights reserved.
          </p>
        </div>

        <nav aria-label="Footer" className={`grid grid-cols-2 gap-x-8 gap-y-10 ${COLS[Math.min(4, nav.footerColumns.length)] ?? "sm:grid-cols-2"}`}>
          {columns.map((col) => (
            <div key={col.id}>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-road/70">{col.heading}</p>
              <ul className="mt-3 space-y-2 text-[15px]">
                {col.links.map((l) => {
                  const ext = /^https?:\/\//.test(l.href) || ("newTab" in l && l.newTab);
                  return (
                    <li key={l.id}>
                      <Link href={l.href} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="break-words transition hover:text-sky">
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
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
