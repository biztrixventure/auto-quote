import type { MetadataRoute } from "next";
import { livePosts } from "@/lib/blog";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic"; // uses SITE_URL from the running server, not the build

// Public pages only. Quote results, previews and admin pages are private and stay out.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [posts, categories, pages, states] = await Promise.all([
    db.post.findMany({ where: { AND: [livePosts(), { noindex: false }] }, orderBy: { publishedAt: "desc" }, select: { slug: true, updatedAt: true, coverImageId: true } }),
    db.category.findMany({ where: { posts: { some: livePosts() } }, select: { slug: true } }),
    db.page.findMany({ where: { status: "published", noindex: false }, select: { slug: true, updatedAt: true } }),
    db.stateGuide.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const latest = posts[0]?.updatedAt ?? now;
  return [
    { url: `${site.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/quote/auto`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...["/repair-costs", "/why-us", "/faq"].map((p) => ({ url: `${site.url}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...pages.map((p) => ({ url: `${site.url}/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...(states.length ? [{ url: `${site.url}/car-insurance`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 }] : []),
    ...states.map((s) => ({ url: `${site.url}/car-insurance/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${site.url}/blog`, lastModified: latest, changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({ url: `${site.url}/blog/category/${c.slug}`, lastModified: latest, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...posts.map((p) => ({
      url: `${site.url}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(p.coverImageId ? { images: [`${site.url}/media/${p.coverImageId}`] } : {}),
    })),
    { url: `${site.url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/do-not-sell`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
