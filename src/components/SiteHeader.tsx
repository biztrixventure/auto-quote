import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

// Links, phone and button come from /admin/content → Navigation bar.
export async function SiteHeader() {
  const [s, { navigation: nav }] = await Promise.all([getSite(), getSettings()]);
  return (
    <header className="relative z-30 border-b border-rail bg-white text-asphalt">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
          <img src="/brand/logo.webp" alt={site.name} width={720} height={169} fetchPriority="high" className="h-9 w-auto sm:h-11" />
        </Link>
        <HeaderNav links={nav.links} phone={nav.showPhone ? s.phone : null} phoneHref={s.phoneHref} ctaLabel={nav.ctaLabel} ctaHref={nav.ctaHref} />
      </div>
    </header>
  );
}
