import { PageHero, QuoteBanner } from "@/components/sections";
import { mediaUrl, withHeadingIds } from "@/lib/blog";

export type CustomPageData = { title: string; slug: string; intro: string; content: string; layout: string; showQuoteCta: boolean; coverImageId: string | null; coverAlt: string };

/** A page built in /admin/pages. */
export function CustomPage({ page }: { page: CustomPageData }) {
  const { html } = withHeadingIds(page.content);
  const cover = mediaUrl(page.coverImageId);
  // Content lines up with the title above it; "standard" keeps lines to a comfortable reading width.
  const inner = page.layout === "wide" ? "" : "max-w-3xl";
  return (
    <>
      <PageHero title={page.title} intro={page.intro || undefined} crumbs={[{ name: page.title, href: `/${page.slug}` }]} />
      <div className="mx-auto max-w-6xl px-5 py-12">
        {cover && <img src={cover} alt={page.coverAlt} fetchPriority="high" className={`mb-10 aspect-[16/9] w-full rounded-2xl object-cover ${inner}`} />}
        <div className={`post-content ${inner}`} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {page.showQuoteCta && <QuoteBanner />}
    </>
  );
}
