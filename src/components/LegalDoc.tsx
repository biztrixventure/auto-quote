import Link from "next/link";
import { PageHero } from "@/components/sections";
import { withHeadingIds } from "@/lib/blog";
import { legalDate } from "@/lib/legal";
import { jsonLd } from "@/lib/security";
import { site } from "@/lib/site";

/** Privacy Policy / Terms of Use layout: header, sticky table of contents, the document. */
export function LegalDoc({ title, path, html, updated, description }: { title: string; path: string; html: string; updated: string; description: string }) {
  const { html: body, toc } = withHeadingIds(html);
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: `${site.url}${path}`,
    description,
    dateModified: updated,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
    publisher: { "@id": `${site.url}/#organization` },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PageHero eyebrow="Legal" title={title} crumbs={[{ name: title, href: path }]}>
        <p className="mt-4 text-sm text-road">
          Last updated <time dateTime={updated} className="font-semibold text-asphalt">{legalDate(updated)}</time>
        </p>
      </PageHero>
      <div className="mx-auto max-w-6xl px-5 py-12 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
        <aside className="mb-10 lg:mb-0">
          <nav aria-label="On this page" className="rounded-2xl bg-[#F7F9FC] p-5 lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-road">On this page</p>
            <ol className="mt-3 space-y-2 text-sm">
              {toc.filter((t) => t.level === 2).map((t) => (
                <li key={t.id}><a href={`#${t.id}`} className="block leading-snug text-road transition hover:text-sky">{t.text}</a></li>
              ))}
            </ol>
            <div className="mt-5 border-t border-rail pt-4 text-sm">
              <Link href="/do-not-sell" className="font-semibold text-sky hover:underline">Your privacy choices →</Link>
            </div>
          </nav>
        </aside>
        <div className="post-content max-w-3xl" dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    </>
  );
}
