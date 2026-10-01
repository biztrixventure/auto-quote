"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavLink } from "@/lib/settings";

type Props = { links: NavLink[]; phone: string | null; phoneHref: string; ctaLabel: string; ctaHref: string };

// Header links, phone and quote button; collapses into a menu on small screens.
export function HeaderNav({ links, phone, phoneHref, ctaLabel, ctaHref }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (href: string) => !href.includes("#") && href !== "/" && (path === href || path.startsWith(`${href}/`));
  const external = (href: string) => href.startsWith("https://");

  const item = (l: NavLink, mobile = false) => (
    <Link
      key={`${l.label}-${l.href}`}
      href={l.href}
      {...(external(l.href) ? { target: "_blank", rel: "noreferrer" } : {})}
      aria-current={active(l.href) ? "page" : undefined}
      className={
        mobile
          ? `block rounded-lg px-3 py-3 text-base font-semibold ${active(l.href) ? "bg-mist text-sky" : "text-asphalt hover:bg-mist"}`
          : `relative py-2 text-[15px] font-semibold transition hover:text-sky ${active(l.href) ? "text-sky after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-sky" : "text-asphalt"}`
      }
    >
      {l.label}
    </Link>
  );

  return (
    <>
      {links.length > 0 && <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">{links.map((l) => item(l))}</nav>}

      <div className="flex items-center gap-3 sm:gap-4">
        {phone && (
          <a href={phoneHref} className="hidden text-[15px] font-semibold text-asphalt hover:text-sky md:inline">
            {phone}
          </a>
        )}
        {ctaLabel && (
          <Link href={ctaHref} className="hidden rounded-lg bg-line px-4 py-2.5 text-sm font-bold text-asphalt shadow-sm transition hover:bg-[#E3B21F] sm:inline-flex">
            {ctaLabel}
          </Link>
        )}
        {(links.length > 0 || phone || ctaLabel) && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-lg border border-rail text-asphalt lg:hidden"
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 border-b border-rail bg-white px-5 pb-5 pt-2 shadow-lg lg:hidden">
          <nav aria-label="Main" className="space-y-1">{links.map((l) => item(l, true))}</nav>
          <div className="mt-4 grid gap-2 border-t border-rail pt-4">
            {ctaLabel && (
              <Link href={ctaHref} className="rounded-lg bg-line px-4 py-3 text-center font-bold text-asphalt">
                {ctaLabel}
              </Link>
            )}
            {phone && (
              <a href={phoneHref} className="rounded-lg border border-rail px-4 py-3 text-center font-semibold text-asphalt">
                Call {phone}
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
