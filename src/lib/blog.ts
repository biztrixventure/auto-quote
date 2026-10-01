import sanitizeHtml from "sanitize-html";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { site } from "./site";

export const POST_STATUSES = { draft: "Draft", review: "In review", scheduled: "Scheduled", published: "Published" } as const;
export type PostState = keyof typeof POST_STATUSES;

/** What a visitor would see right now: draft, in review, scheduled (published in the future) or live. */
export function postState(p: { status: string; publishedAt: Date | null }): PostState {
  if (p.status === "published") return p.publishedAt && p.publishedAt > new Date() ? "scheduled" : "published";
  return p.status === "review" ? "review" : "draft";
}

/** Posts visitors may see. */
export const livePosts = (): Prisma.PostWhereInput => ({ status: "published", publishedAt: { lte: new Date() } });

export function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** `base`, or `base-2`, `base-3`… if another post already uses it. */
export async function uniquePostSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "post";
  for (let n = 1; n < 200; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const taken = await db.post.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (!taken) return slug;
  }
  return `${root}-${Date.now()}`;
}

const siteHost = (() => {
  try {
    return new URL(site.url).host;
  } catch {
    return "";
  }
})();

/**
 * Cleans HTML from the editor before it is stored or shown. Only formatting the editor can
 * produce is kept (no scripts, styles, event handlers or unknown embeds), so a writer can't
 * inject code into the site. Images: uploaded (/media/...) or https. Video: YouTube only.
 */
export function sanitizePostHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "br", "img", "table", "thead", "tbody", "tr", "th", "td", "div", "iframe"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      div: ["data-youtube-video"],
      iframe: ["src", "width", "height", "allowfullscreen", "loading", "title"],
      ol: ["start"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"], iframe: ["https"] },
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube-nocookie.com", "www.youtube.com"],
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        let external = false;
        try {
          external = /^https?:/i.test(href) && new URL(href).host !== siteHost;
        } catch {}
        const { target: _t, rel: _r, ...rest } = attribs;
        return { tagName, attribs: external ? { ...rest, target: "_blank", rel: "noopener noreferrer" } : rest };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
      iframe: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", title: attribs.title || "Video" } }),
      h1: "h2", // one H1 per page: the post title
      h5: "h4",
      h6: "h4",
    },
    exclusiveFilter: (frame) => frame.tag === "div" && !("data-youtube-video" in frame.attribs) && !frame.text.trim(),
  }).trim();
}

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

export const wordCount = (html: string) => (textOf(html).match(/\S+/g) ?? []).length;
export const readingMinutes = (html: string) => Math.max(1, Math.round(wordCount(html) / 220));

/** First ~160 characters of the text, cut at a word. */
export function autoExcerpt(html: string, max = 160) {
  const t = textOf(html);
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Adds ids to H2/H3 headings (for links and the table of contents) and lists them. */
export function withHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, inner: string) => {
    const text = textOf(inner);
    let id = slugify(text) || "section";
    for (let n = 2; used.has(id); n++) id = `${slugify(text) || "section"}-${n}`;
    used.add(id);
    toc.push({ id, text, level: Number(lvl) as 2 | 3 });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

export const mediaUrl = (id: string | null | undefined) => (id ? `/media/${id}` : null);
export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${site.url}${path}`);

export function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** "car insurance, Warranty , tips" → unique tags with slugs. */
export function parseTags(raw: string) {
  const seen = new Set<string>();
  const out: { name: string; slug: string }[] = [];
  for (const part of raw.split(",")) {
    const name = part.trim().replace(/\s+/g, " ").slice(0, 40);
    const slug = slugify(name);
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ name, slug });
    if (out.length >= 12) break;
  }
  return out;
}

/** Fields every public post card needs. */
export const cardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  publishedAt: true,
  readingMinutes: true,
  coverImageId: true,
  coverAlt: true,
  featured: true,
  category: { select: { name: true, slug: true } },
  author: { select: { name: true, avatarId: true } },
} satisfies Prisma.PostSelect;
export type PostCardData = Prisma.PostGetPayload<{ select: typeof cardSelect }>;
