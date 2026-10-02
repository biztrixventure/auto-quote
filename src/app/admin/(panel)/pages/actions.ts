"use server";

import { after } from "next/server";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";
import { submitToIndexNow } from "@/lib/indexnow";
import { sanitizePostHtml, slugify } from "@/lib/blog";
import { db } from "@/lib/db";
import { RESERVED_SLUGS } from "@/lib/menus";

export type PageInput = {
  id?: string;
  title: string;
  slug: string;
  intro: string;
  content: string;
  status: "draft" | "published";
  layout: "standard" | "wide";
  showQuoteCta: boolean;
  coverImageId: string | null;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
};
export type PageSaveResult = { ok: true; id: string; slug: string; status: string; message: string } | { ok: false; error: string };

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function savePage(input: PageInput): Promise<PageSaveResult> {
  const me = await requireAdmin("admin");
  const existing = input.id ? await db.page.findUnique({ where: { id: input.id }, select: { id: true, status: true } }) : null;
  if (input.id && !existing) return { ok: false, error: "This page no longer exists." };

  const title = clean(input.title, 120);
  if (!title) return { ok: false, error: "Give the page a title." };
  const slug = slugify(clean(input.slug, 80) || title);
  if (!slug) return { ok: false, error: "The web address needs at least one letter or number." };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: `/${slug} is already used by the site. Choose another address.` };
  const clash = await db.page.findFirst({ where: { slug, ...(existing ? { NOT: { id: existing.id } } : {}) }, select: { id: true } });
  if (clash) return { ok: false, error: `Another page already uses /${slug}.` };
  if (String(input.content ?? "").length > 400_000) return { ok: false, error: "This page is too long to save." };

  const content = sanitizePostHtml(String(input.content ?? ""));
  const status = input.status === "published" ? "published" : "draft";
  if (status === "published" && !content.replace(/<[^>]+>/g, "").trim() && !/<img|<iframe/.test(content)) {
    return { ok: false, error: "The page is empty. Add some content before publishing." };
  }
  const coverImageId = input.coverImageId && (await db.media.findUnique({ where: { id: input.coverImageId }, select: { id: true } })) ? input.coverImageId : null;

  const data = {
    title,
    slug,
    intro: clean(input.intro, 300),
    content,
    status,
    layout: input.layout === "wide" ? "wide" : "standard",
    showQuoteCta: !!input.showQuoteCta,
    coverImageId,
    coverAlt: clean(input.coverAlt, 200),
    seoTitle: clean(input.seoTitle, 70),
    seoDescription: clean(input.seoDescription, 200),
    noindex: !!input.noindex,
    updatedById: me.id,
  };
  const page = existing
    ? await db.page.update({ where: { id: existing.id }, data, select: { id: true, slug: true, status: true } })
    : await db.page.create({ data, select: { id: true, slug: true, status: true } });

  const action = !existing ? "page_created" : status === "published" && existing.status !== "published" ? "page_published" : status === "draft" && existing.status === "published" ? "page_unpublished" : "page_updated";
  await audit(me.email, action, "page", page.id, { title });
  if (status === "published" || existing?.status === "published") {
    after(() => submitToIndexNow([`/${page.slug}`], me.email));
  }
  const message = status === "published" ? (existing?.status === "published" ? "Saved. Changes are live." : `Published at /${page.slug}. Add it to a menu so visitors can find it.`) : "Draft saved.";
  return { ok: true, id: page.id, slug: page.slug, status: page.status, message };
}

export async function deletePage(id: string): Promise<{ ok: boolean }> {
  const me = await requireAdmin("admin");
  const page = await db.page.findUnique({ where: { id }, select: { title: true } });
  if (page) {
    await db.page.delete({ where: { id } });
    await audit(me.email, "page_deleted", "page", id, { title: page.title });
  }
  return { ok: true };
}
