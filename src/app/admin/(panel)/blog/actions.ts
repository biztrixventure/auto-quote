"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { audit } from "@/lib/audit";
import { submitToIndexNow } from "@/lib/indexnow";
import { submitSitemapToGoogle } from "@/lib/search-console";
import { isEditor } from "@/lib/auth";
import { requireAdmin, requireBlogAccess } from "@/lib/admin-guard";
import { autoExcerpt, parseTags, postState, readingMinutes, sanitizePostHtml, slugify, uniquePostSlug } from "@/lib/blog";
import { db } from "@/lib/db";
import { getSettings, saveSetting } from "@/lib/settings";

const KEEP_REVISIONS = 25;
const MAX_HTML = 400_000;

export type PostIntent = "draft" | "review" | "publish" | "unpublish";
export type PostInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string | null;
  tags: string;
  coverImageId: string | null;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  featured: boolean;
  publishAt: string | null; // ISO date-time; empty = now (or keep the original date)
  intent: PostIntent;
};
export type SaveResult =
  | { ok: true; id: string; slug: string; status: string; publishedAt: string | null; message: string }
  | { ok: false; error: string };

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** What this person may do with this post. */
async function access(me: { id: string; role: string }, post: { authorId: string; status: string } | null) {
  const editor = isEditor(me);
  const { blog } = await getSettings();
  const canPublish = editor || blog.writersCanPublish;
  if (!post) return { canEdit: true, canPublish, editor };
  const own = post.authorId === me.id;
  // Without publish rights a writer can't change a live post (it would go live unreviewed).
  const canEdit = editor || (own && (post.status !== "published" || blog.writersCanPublish));
  return { canEdit, canPublish: canPublish && (editor || own), editor };
}

export async function savePost(input: PostInput): Promise<SaveResult> {
  const me = await requireBlogAccess();
  const existing = input.id ? await db.post.findUnique({ where: { id: input.id }, select: { id: true, authorId: true, status: true, publishedAt: true, title: true, excerpt: true, content: true } }) : null;
  if (input.id && !existing) return { ok: false, error: "This post no longer exists." };
  const can = await access(me, existing);
  if (!can.canEdit) return { ok: false, error: "You can't change this post. Ask an admin." };
  if ((input.intent === "publish" || input.intent === "unpublish") && !can.canPublish) {
    return { ok: false, error: "Only an admin can publish. Use “Send for review” instead." };
  }

  const title = clean(input.title, 160) || "Untitled post";
  if (String(input.content ?? "").length > MAX_HTML) return { ok: false, error: "This post is too long to save (over 400 KB of text)." };
  const content = sanitizePostHtml(String(input.content ?? ""));
  const hasText = content.replace(/<[^>]+>/g, "").trim().length > 0 || /<img|<iframe/.test(content);
  if (input.intent !== "draft" && input.intent !== "unpublish") {
    if (title === "Untitled post") return { ok: false, error: "Give the post a title first." };
    if (!hasText) return { ok: false, error: "The post is empty. Write something first." };
  }

  let publishAt: Date | null = null;
  if (input.publishAt) {
    const d = new Date(input.publishAt);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "That publish date isn't valid." };
    publishAt = d;
  }

  let status = existing?.status ?? "draft";
  let publishedAt = existing?.publishedAt ?? null;
  if (input.intent === "draft") status = existing?.status === "published" ? "published" : "draft";
  if (input.intent === "review") status = "review";
  if (input.intent === "publish") {
    status = "published";
    publishedAt = publishAt ?? (existing?.status === "published" && existing.publishedAt ? existing.publishedAt : new Date());
  }
  if (input.intent === "unpublish") {
    status = "draft";
    publishedAt = null;
  }
  if (input.intent === "draft" && status === "published" && publishAt) publishedAt = publishAt;

  const categoryId = input.categoryId && (await db.category.findUnique({ where: { id: input.categoryId }, select: { id: true } })) ? input.categoryId : null;
  const coverImageId = input.coverImageId && (await db.media.findUnique({ where: { id: input.coverImageId }, select: { id: true } })) ? input.coverImageId : null;
  const slug = await uniquePostSlug(clean(input.slug, 80) || title, existing?.id);
  const excerpt = clean(input.excerpt, 300) || autoExcerpt(content);
  const tags = parseTags(String(input.tags ?? ""));

  const data = {
    title,
    slug,
    excerpt,
    content,
    status,
    publishedAt,
    categoryId,
    coverImageId,
    coverAlt: clean(input.coverAlt, 200),
    seoTitle: clean(input.seoTitle, 70),
    seoDescription: clean(input.seoDescription, 200),
    noindex: !!input.noindex,
    featured: can.editor ? !!input.featured : undefined, // only editors pick featured posts
    readingMinutes: readingMinutes(content),
  };
  const tagLinks = { connectOrCreate: tags.map((t) => ({ where: { slug: t.slug }, create: t })) };
  const pick = { id: true, slug: true, status: true, publishedAt: true } as const;

  const post = existing
    ? (
        await db.$transaction([
          db.post.update({ where: { id: existing.id }, data: { ...data, tags: { set: [] } }, select: { id: true } }),
          db.post.update({ where: { id: existing.id }, data: { tags: tagLinks }, select: pick }),
        ])
      )[1]
    : await db.post.create({ data: { ...data, featured: can.editor ? !!input.featured : false, tags: tagLinks, authorId: me.id }, select: pick });

  const changed = !existing || existing.title !== title || existing.excerpt !== excerpt || existing.content !== content;
  if (changed) {
    await db.postRevision.create({ data: { postId: post.id, editorId: me.id, title, excerpt, content } });
    const old = await db.postRevision.findMany({ where: { postId: post.id }, orderBy: { createdAt: "desc" }, skip: KEEP_REVISIONS, select: { id: true } });
    if (old.length) await db.postRevision.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
  }

  const state = postState(post);
  const action = !existing ? "post_created" : input.intent === "publish" ? (existing.status === "published" ? "post_updated" : "post_published") : input.intent === "review" ? "post_submitted" : input.intent === "unpublish" ? "post_unpublished" : "post_updated";
  await audit(me.email, action, "post", post.id, { title });
  // Tell Bing, Yandex & co. about live (or just unpublished) posts, after the save finishes.
  if (state === "published" || existing?.status === "published") {
    after(() =>
      Promise.all([
        submitToIndexNow([`/blog/${post.slug}`, "/blog"], me.email),
        submitSitemapToGoogle(me.email, { minIntervalMs: 30 * 60_000 }),
      ]),
    );
  }

  const message =
    state === "published" ? (input.intent === "publish" && existing?.status !== "published" ? "Published. It's live on the blog." : "Saved. Changes are live.")
    : state === "scheduled" ? `Scheduled. It goes live ${post.publishedAt!.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`
    : state === "review" ? "Sent for review. An admin will publish it."
    : "Draft saved.";
  return { ok: true, id: post.id, slug: post.slug, status: post.status, publishedAt: post.publishedAt?.toISOString() ?? null, message };
}

export async function deletePost(id: string): Promise<{ ok: boolean; error?: string }> {
  const me = await requireBlogAccess();
  const post = await db.post.findUnique({ where: { id }, select: { id: true, title: true, authorId: true, status: true } });
  if (!post) return { ok: true };
  if (!isEditor(me) && (post.authorId !== me.id || post.status === "published")) return { ok: false, error: "Only an admin can delete this post." };
  await db.post.delete({ where: { id } });
  await audit(me.email, "post_deleted", "post", id, { title: post.title });
  return { ok: true };
}

/** An earlier version, to load back into the editor. */
export async function getRevision(id: string) {
  const me = await requireBlogAccess();
  const rev = await db.postRevision.findUnique({ where: { id }, select: { title: true, excerpt: true, content: true, post: { select: { authorId: true } } } });
  if (!rev || (!isEditor(me) && rev.post.authorId !== me.id)) return null;
  return { title: rev.title, excerpt: rev.excerpt, content: rev.content };
}

// ── Images library ─────────────────────────────────────────────

export async function listMedia(page = 0) {
  await requireBlogAccess();
  const take = 24;
  const rows = await db.media.findMany({
    orderBy: { createdAt: "desc" },
    skip: Math.max(0, page) * take,
    take: take + 1,
    select: { id: true, fileName: true, width: true, height: true, alt: true, createdAt: true },
  });
  return { items: rows.slice(0, take).map((m) => ({ ...m, url: `/media/${m.id}`, createdAt: m.createdAt.toISOString() })), more: rows.length > take };
}

export async function deleteMedia(f: FormData) {
  const me = await requireBlogAccess();
  const id = String(f.get("id") ?? "");
  const m = await db.media.findUnique({ where: { id }, select: { id: true, uploaderId: true, fileName: true } });
  const back = (q: Record<string, string>) => redirect(`/admin/blog/media?${new URLSearchParams(q)}`);
  if (!m) back({ saved: "Image deleted." });
  if (!isEditor(me) && m!.uploaderId !== me.id) back({ error: "You can only delete images you uploaded." });
  const url = `/media/${id}`;
  const inUse =
    (await db.post.count({ where: { OR: [{ coverImageId: id }, { content: { contains: url } }] } })) +
    (await db.adminUser.count({ where: { avatarId: id } }));
  if (inUse) back({ error: "That image is used in a post or profile. Remove it there first." });
  await db.media.delete({ where: { id } });
  await audit(me.email, "media_deleted", "media", id, { name: m!.fileName });
  back({ saved: "Image deleted." });
}

// ── Categories and blog settings (admins) ──────────────────────

const backSettings = (q: Record<string, string>) => redirect(`/admin/blog/settings?${new URLSearchParams(q)}`);

export async function saveCategory(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const name = clean(f.get("name"), 50);
  if (!name) backSettings({ error: "Give the category a name." });
  const slug = slugify(clean(f.get("slug"), 60) || name);
  const clash = await db.category.findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) backSettings({ error: `Another category already uses the address /blog/category/${slug}.` });
  const data = { name, slug, description: clean(f.get("description"), 300), sortOrder: Math.round(Number(f.get("sortOrder")) || 0) };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  await audit(me.email, id ? "category_updated" : "category_created", "category", id || slug, { name });
  backSettings({ saved: `Category “${name}” saved.` });
}

export async function deleteCategory(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const c = await db.category.findUnique({ where: { id }, select: { name: true } });
  if (c) {
    await db.category.delete({ where: { id } }); // its posts become uncategorized
    await audit(me.email, "category_deleted", "category", id, { name: c.name });
  }
  backSettings({ saved: "Category deleted. Its posts are now uncategorized." });
}

export async function saveBlogSettings(f: FormData) {
  const me = await requireAdmin("admin");
  const title = clean(f.get("title"), 80);
  if (!title) backSettings({ error: "The blog needs a title." });
  await saveSetting("blog", {
    title,
    intro: clean(f.get("intro"), 300),
    postsPerPage: Math.min(30, Math.max(3, Math.round(Number(f.get("postsPerPage")) || 9))),
    writersCanPublish: f.get("writersCanPublish") === "on",
    showQuoteCta: f.get("showQuoteCta") === "on",
    ctaTitle: clean(f.get("ctaTitle"), 80),
    ctaText: clean(f.get("ctaText"), 240),
  });
  await audit(me.email, "settings_updated", "setting", "blog", { section: "blog" });
  backSettings({ saved: "Blog settings saved." });
}
