import { z } from "zod";
import { db } from "./db";
import type { NavigationSettings } from "./settings";

/** A page on this site (/blog, /faq#x) or a full https:// address. */
export const linkOk = (v: string) => (v.startsWith("/") && !v.startsWith("//") && !/\s/.test(v)) || /^https:\/\/[^\s]+$/.test(v) || /^(tel|mailto):[^\s]+$/.test(v);

/** Addresses custom pages can't use because the site already has something there. */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "blog", "quote", "media", "privacy", "terms", "faq", "why-us", "repair-costs", "preview", "page", "pages",
  "sitemap.xml", "robots.txt", "manifest.webmanifest", "opengraph-image", "twitter-image", "icon.png", "apple-icon.png", "favicon.ico", "_next", "search", "login",
]);

export const LIMITS = { topItems: 10, children: 12, footerColumns: 4, footerLinks: 12 };

const href = z.string().trim().max(300).refine(linkOk, "Use a page path like /blog, a full https:// address, tel: or mailto:.");
const label = z.string().trim().min(1, "Every link needs a label.").max(40);
const child = z.object({ id: z.string().max(40), label, href, newTab: z.boolean().optional(), description: z.string().trim().max(120).optional() });
const top = child.extend({ children: z.array(child).max(LIMITS.children).optional() });

const schema = z.object({
  links: z.array(top).max(LIMITS.topItems),
  showPhone: z.boolean(),
  ctaLabel: z.string().trim().max(30),
  ctaHref: z.string().trim().max(300),
  sticky: z.boolean(),
  announcement: z.object({ enabled: z.boolean(), text: z.string().trim().max(160), linkLabel: z.string().trim().max(30), href: z.string().trim().max(300) }),
  footerColumns: z.array(z.object({ id: z.string().max(40), title: z.string().trim().min(1, "Every footer column needs a title.").max(40), links: z.array(child).max(LIMITS.footerLinks) })).max(LIMITS.footerColumns),
});

/** Checks a menu sent from the admin editor; returns a readable error if something's wrong. */
export function cleanNavigation(input: unknown): { ok: true; nav: NavigationSettings } | { ok: false; error: string } {
  const r = schema.safeParse(input);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { ok: false, error: issue?.message ?? "Something in the menu isn't valid." };
  }
  const nav = r.data;
  if (nav.ctaLabel && !linkOk(nav.ctaHref)) return { ok: false, error: "The button link must be a page path like /quote/auto or a full https:// address." };
  if (nav.announcement.enabled) {
    if (!nav.announcement.text) return { ok: false, error: "Write the announcement text, or turn the announcement off." };
    if (nav.announcement.href && !linkOk(nav.announcement.href)) return { ok: false, error: "The announcement link must be a page path or a full https:// address." };
  }
  // Drop empty optional fields so the saved menu stays tidy.
  const tidy = <T extends { newTab?: boolean; description?: string }>(i: T) => ({ ...i, newTab: i.newTab || undefined, description: i.description || undefined });
  return {
    ok: true,
    nav: {
      ...nav,
      links: nav.links.map((l) => ({ ...tidy(l), children: l.children?.length ? l.children.map(tidy) : undefined })),
      footerColumns: nav.footerColumns.map((c) => ({ ...c, links: c.links.map(tidy) })),
    },
  };
}

export type LinkOption = { label: string; href: string };
export type LinkGroup = { group: string; items: LinkOption[] };

/** Everything a menu can link to, for the "Add link" picker. */
export async function linkOptions(): Promise<LinkGroup[]> {
  const [pages, categories] = await Promise.all([
    db.page.findMany({ orderBy: { title: "asc" }, select: { title: true, slug: true, status: true } }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
  ]);
  return [
    {
      group: "Main pages",
      items: [
        { label: "Home", href: "/" },
        { label: "Get a quote", href: "/quote/auto" },
        { label: "Repair costs", href: "/repair-costs" },
        { label: "Why us", href: "/why-us" },
        { label: "FAQ", href: "/faq" },
        { label: "Blog", href: "/blog" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
      ],
    },
    { group: "Your pages", items: pages.map((p) => ({ label: p.status === "published" ? p.title : `${p.title} (draft)`, href: `/${p.slug}` })) },
    { group: "Blog categories", items: categories.map((c) => ({ label: c.name, href: `/blog/category/${c.slug}` })) },
  ].filter((g) => g.items.length);
}
