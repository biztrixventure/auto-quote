import { NextResponse } from "next/server";
import type { ApiCaller } from "./api-keys";
import { audit } from "./audit";
import { mediaUrl, postState, slugify } from "./blog";
import { db } from "./db";
import type { PostInput, PostIntent } from "./post-save";
import { site } from "./site";

// Helpers for the blog publishing API (/api/blog-api/v1/*).

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
export const apiError = (status: number, error: string) => json({ error }, status);

/** Reads a JSON body of at most `max` bytes. */
export async function readJson(req: Request, max = 600_000): Promise<Record<string, unknown> | NextResponse> {
  if (!req.headers.get("content-type")?.includes("application/json")) return apiError(415, "Send JSON (Content-Type: application/json)");
  const raw = await req.text();
  if (raw.length > max) return apiError(413, "Request too large");
  try {
    const body = JSON.parse(raw);
    return body && typeof body === "object" && !Array.isArray(body) ? body : apiError(400, "Body must be a JSON object");
  } catch {
    return apiError(400, "Invalid JSON");
  }
}

const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v));

/**
 * Finds a category by id, slug or name. Editors (admin/owner keys) create it if it doesn't exist.
 * Returns null for "no category", or an error message.
 */
export async function resolveCategory(caller: ApiCaller, value: unknown): Promise<{ id: string | null } | { error: string }> {
  const v = str(value)?.trim();
  if (!v) return { id: null };
  const slug = slugify(v).slice(0, 60);
  const found = await db.category.findFirst({ where: { OR: [{ id: v }, { slug }, { name: { equals: v, mode: "insensitive" } }] }, select: { id: true } });
  if (found) return { id: found.id };
  if (!caller.editor) return { error: `Category "${v}" doesn't exist, and only an admin key can create categories.` };
  const created = await db.category.create({ data: { name: v.slice(0, 50), slug }, select: { id: true } });
  await audit(caller.saver.actor ?? caller.saver.email, "category_created", "category", slug, { name: v });
  return { id: created.id };
}

const INTENTS: Record<string, PostIntent> = { draft: "draft", review: "review", publish: "publish", published: "publish", unpublish: "unpublish" };

type Existing = {
  title: string; slug: string; excerpt: string; content: string; categoryId: string | null; coverImageId: string | null; coverAlt: string;
  seoTitle: string; seoDescription: string; noindex: boolean; featured: boolean; status: string; publishedAt: Date | null; tags: { name: string }[];
};

/** Turns an API body into the editor's PostInput. On update, fields left out keep their current value. */
export function toPostInput(body: Record<string, unknown>, categoryId: string | null | undefined, existing?: Existing & { id: string }): PostInput | { error: string } {
  const intent = INTENTS[String(body.status ?? (existing ? (existing.status === "published" ? "publish" : existing.status) : "draft"))];
  if (!intent) return { error: 'status must be "draft", "review", "publish" or "unpublish"' };
  const tags = Array.isArray(body.tags) ? body.tags.map(String).join(", ") : str(body.tags);
  const pick = <T,>(key: string, fallback: T): T | string => (body[key] === undefined ? fallback : String(body[key] ?? ""));
  return {
    id: existing?.id,
    title: String(pick("title", existing?.title ?? "")),
    slug: String(pick("slug", existing?.slug ?? "")),
    excerpt: String(pick("excerpt", existing?.excerpt ?? "")),
    content: String(pick("content", existing?.content ?? "")),
    categoryId: categoryId === undefined ? (existing?.categoryId ?? null) : categoryId,
    tags: tags ?? (existing?.tags.map((t) => t.name).join(", ") ?? ""),
    coverImageId: body.coverImageId === undefined ? (existing?.coverImageId ?? null) : str(body.coverImageId) || null,
    coverAlt: String(pick("coverAlt", existing?.coverAlt ?? "")),
    seoTitle: String(pick("seoTitle", existing?.seoTitle ?? "")),
    seoDescription: String(pick("seoDescription", existing?.seoDescription ?? "")),
    noindex: body.noindex === undefined ? !!existing?.noindex : !!body.noindex,
    featured: body.featured === undefined ? !!existing?.featured : !!body.featured,
    publishAt: body.publishAt === undefined ? null : str(body.publishAt) || null,
    intent,
  };
}

export const postSelect = {
  id: true, title: true, slug: true, excerpt: true, content: true, status: true, publishedAt: true, updatedAt: true, categoryId: true, coverImageId: true,
  coverAlt: true, seoTitle: true, seoDescription: true, noindex: true, featured: true, readingMinutes: true, authorId: true,
  tags: { select: { name: true, slug: true }, orderBy: { name: "asc" } }, category: { select: { name: true, slug: true } },
} as const;

type PostRow = { id: string; title: string; slug: string; status: string; publishedAt: Date | null; coverImageId: string | null };

/** Public-facing view of a post, with its state and links. */
export function postView<T extends PostRow>(p: T) {
  return {
    ...p,
    state: postState(p),
    url: `${site.url}/blog/${p.slug}`,
    adminUrl: `${site.url}/admin/blog/${p.id}`,
    coverUrl: p.coverImageId ? `${site.url}${mediaUrl(p.coverImageId)}` : null,
  };
}
