"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { isEditor } from "@/lib/auth";
import { requireAdmin, requireBlogAccess } from "@/lib/admin-guard";
import { slugify } from "@/lib/blog";
import { savePostAs, type PostInput, type SaveResult } from "@/lib/post-save";
import { db } from "@/lib/db";
import { getSettings, saveSetting } from "@/lib/settings";

export type { PostInput, PostIntent, SaveResult } from "@/lib/post-save";

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Saves a post from the admin editor. The rules live in src/lib/post-save.ts (shared with the publishing API). */
export async function savePost(input: PostInput): Promise<SaveResult> {
  const me = await requireBlogAccess();
  return savePostAs(me, input);
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
