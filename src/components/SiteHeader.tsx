import Link from "next/link";
import { getSite } from "@/lib/settings";
import { site } from "@/lib/site";

export async function SiteHeader() {
  const s = await getSite();
  return (
    <header className="border-b border-rail bg-white text-asphalt">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
          <img src="/brand/logo.webp" alt={site.name} width={720} height={169} fetchPriority="high" className="h-9 w-auto sm:h-11" />
        </Link>
        <a href={s.phoneHref} className="text-[15px] font-semibold text-asphalt hover:text-sky">
          <span className="hidden sm:inline">Talk to a licensed agent: </span>
          {s.phone}
        </a>
      </div>
    </header>
  );
}
