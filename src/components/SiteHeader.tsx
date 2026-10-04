import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

// Everything here is set in /admin/menus: links and dropdowns, phone, button, sticky header
// and the announcement bar.
export async function SiteHeader() {
  const [s, { navigation: nav }] = await Promise.all([getSite(), getSettings()]);
  const a = nav.announcement;
  const external = /^https?:\/\//.test(a.href);
  return (
    <>
      {a.enabled && a.text && (
        <div className="bg-asphalt px-5 py-2 text-center text-sm text-white">
          <span>{a.text}</span>
          {a.href && a.linkLabel && (
            <Link href={a.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="ml-2 font-semibold text-line underline underline-offset-4 hover:no-underline">
              {a.linkLabel} →
            </Link>
          )}
        </div>
      )}
      <header className={`${nav.sticky ? "sticky top-0" : "relative"} z-30 border-b border-rail bg-white text-asphalt`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
          <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
            <img src="/brand/logo.webp" alt={site.name} width={720} height={169} className="h-9 w-auto sm:h-11" />
          </Link>
          <HeaderNav links={nav.links} phone={nav.showPhone ? s.phone : null} phoneHref={s.phoneHref} ctaLabel={nav.ctaLabel} ctaHref={nav.ctaHref} siteName={site.name} />
        </div>
      </header>
    </>
  );
}
