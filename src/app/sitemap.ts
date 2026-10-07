import type { MetadataRoute } from "next";
import { livePosts } from "@/lib/blog";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic"; // uses SITE_URL from the running server, not the build

// Public pages only. Quote results, previews and admin pages are private and stay out.
// lastModified is only given where we know the real date of the last change (Google ignores
// priority and changefreq, and learns to distrust lastmod values that change on every request).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, pages, { legal }] = await Promise.all([
    db.post.findMany({ where: { AND: [livePosts(), { noindex: false }] }, orderBy: { updatedAt: "desc" }, select: { slug: true, updatedAt: true, coverImageId: true } }),
    db.category.findMany({ where: { posts: { some: livePosts() } }, select: { slug: true, posts: { where: livePosts(), orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } } } }),
    db.page.findMany({ where: { status: "published", noindex: false }, select: { slug: true, updatedAt: true } }),
    getSettings(),
  ]);
  const u = (path: string) => `${site.url}${path}`;
  const latestPost = posts[0]?.updatedAt;
  const date = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`) : undefined);

  return [
    { url: u("/"), ...(latestPost ? { lastModified: latestPost } : {}) },
    ...["/quote/vehicle-protection", "/repair-costs", "/why-us", "/faq", "/about"].map((p) => ({ url: u(p) })),
    ...pages.map((p) => ({ url: u(`/${p.slug}`), lastModified: p.updatedAt })),
    ...(posts.length ? [{ url: u("/blog"), lastModified: latestPost }] : [{ url: u("/blog") }]),
    ...categories.map((c) => ({ url: u(`/blog/category/${c.slug}`), ...(c.posts[0] ? { lastModified: c.posts[0].updatedAt } : {}) })),
    ...posts.map((p) => ({
      url: u(`/blog/${p.slug}`),
      lastModified: p.updatedAt,
      ...(p.coverImageId ? { images: [u(`/media/${p.coverImageId}`)] } : {}),
    })),
    { url: u("/privacy"), ...(date(legal.privacyUpdated) ? { lastModified: date(legal.privacyUpdated) } : {}) },
    { url: u("/terms"), ...(date(legal.termsUpdated) ? { lastModified: date(legal.termsUpdated) } : {}) },
    { url: u("/do-not-sell") },
  ];
}
