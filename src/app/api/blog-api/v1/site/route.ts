import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { livePosts } from "@/lib/blog";
import { json } from "@/lib/blog-api";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { guidePath } from "@/lib/state-guides";

export const dynamic = "force-dynamic";

// Everything needed to plan internal links: main pages, state guides, custom pages, categories,
// tags and every post (with its status), plus what this key is allowed to do.
export async function GET(req: Request) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;

  const [posts, categories, tags, pages, states] = await Promise.all([
    db.post.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, slug: true, status: true, publishedAt: true, excerpt: true, category: { select: { name: true } }, tags: { select: { name: true } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, description: true } }),
    db.tag.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true, _count: { select: { posts: true } } } }),
    db.page.findMany({ where: { status: "published" }, select: { title: true, slug: true } }),
    db.stateGuide.findMany({ where: { published: true }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  const live = new Set((await db.post.findMany({ where: livePosts(), select: { id: true } })).map((p) => p.id));
  const u = (p: string) => `${site.url}${p}`;

  return json({
    site: { name: site.name, url: site.url },
    key: { name: caller.keyName, canPublish: caller.canPublish, canCreateCategories: caller.editor },
    rules: {
      content: "HTML. Start at <h2> (the page shows the title as H1). Allowed: p h2 h3 h4 strong em a ul ol li blockquote table img iframe(YouTube).",
      images: "Upload with POST /api/blog-api/v1/media (multipart: file, alt), then use <img src=\"/media/<id>\" alt=\"...\"> or coverImageId.",
      limits: { seoTitle: 70, seoDescription: 200, excerpt: 300, tags: 12, coverAlt: 200 },
    },
    pages: [
      { title: "Home", url: u("/") },
      { title: "Extended car warranty quote", url: u("/quote/vehicle-protection") },
      { title: "Car repair costs", url: u("/repair-costs") },
      { title: "Why choose us", url: u("/why-us") },
      { title: "Extended car warranty FAQ", url: u("/faq") },
      { title: "About us", url: u("/about") },
      { title: "Blog", url: u("/blog") },
      ...pages.map((p) => ({ title: p.title, url: u(`/${p.slug}`) })),
    ],
    stateGuides: states.map((s) => ({ state: s.name, url: u(guidePath(s)) })),
    categories,
    tags: tags.map((t) => ({ name: t.name, slug: t.slug, posts: t._count.posts })),
    posts: posts.map((p) => ({
      id: p.id, title: p.title, slug: p.slug, status: p.status, live: live.has(p.id), publishedAt: p.publishedAt, url: u(`/blog/${p.slug}`),
      category: p.category?.name ?? null, tags: p.tags.map((t) => t.name), excerpt: p.excerpt,
    })),
  });
}
