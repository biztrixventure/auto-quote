import { absoluteUrl, livePosts } from "@/lib/blog";
import { db } from "@/lib/db";
import { fillCompany, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// RSS feed of the latest posts, for feed readers and email newsletter tools.
export async function GET() {
  const [{ blog }, posts] = await Promise.all([
    getSettings(),
    db.post.findMany({
      where: { AND: [livePosts(), { noindex: false }] },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: { title: true, slug: true, excerpt: true, publishedAt: true, author: { select: { name: true } }, category: { select: { name: true } } },
    }),
  ]);
  const title = fillCompany(blog.title);
  const items = posts
    .map((p) => {
      const url = absoluteUrl(`/blog/${p.slug}`);
      return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${p.publishedAt!.toUTCString()}</pubDate><dc:creator>${esc(p.author.name)}</dc:creator>${p.category ? `<category>${esc(p.category.name)}</category>` : ""}<description>${esc(p.excerpt)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${esc(title)}</title><link>${absoluteUrl("/blog")}</link><description>${esc(blog.intro)}</description><language>en-us</language><atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml"/>${posts[0]?.publishedAt ? `<lastBuildDate>${posts[0].publishedAt.toUTCString()}</lastBuildDate>` : ""}${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
