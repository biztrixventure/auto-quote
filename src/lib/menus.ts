import { z } from "zod";
import { db } from "./db";
import type { NavigationSettings } from "./settings";

/** A page on this site (/blog, /faq#x) or a full https:// address. */
export const linkOk = (v: string) => (v.startsWith("/") && !v.startsWith("//") && !/\s/.test(v)) || /^https:\/\/[^\s]+$/.test(v) || /^(tel|mailto):[^\s]+$/.test(v);

/** Addresses custom pages can't use because the site already has something there. */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "blog", "quote", "media", "privacy", "terms", "do-not-sell", "faq", "why-us", "repair-costs", "preview", "page", "pages", "car-insurance", "llms.txt", "indexnow.txt",
  "sitemap.xml", "robots.txt", "manifest.webmanifest", "opengraph-image", "twitter-image", "icon.png", "apple-icon.png", "favicon.ico", "_next", "search", "login",
]);

export const LIMITS = { topItems: 10, children: 12, footerColumns: 4, footerLinks: 12, label: 60, description: 120 };

const href = z.string().trim().max(300, "Link addresses can be up to 300 characters.").refine(linkOk, "Use a page path like /blog, a full https:// address, tel: or mailto:.");
const label = z.string().trim().min(1, "needs a label.").max(LIMITS.label, `label is too long (up to ${LIMITS.label} characters).`);
const child = z.object({
  id: z.string().max(60),
  label,
  href,
  newTab: z.boolean().optional(),
  description: z.string().trim().max(LIMITS.description, `description is too long (up to ${LIMITS.description} characters).`).optional(),
});
const top = child.extend({ children: z.array(child).max(LIMITS.children, `A dropdown can have up to ${LIMITS.children} links.`).optional() });

const schema = z.object({
  links: z.array(top).max(LIMITS.topItems, `The header menu can have up to ${LIMITS.topItems} links.`),
  showPhone: z.boolean(),
  ctaLabel: z.string().trim().max(30, "The button text can be up to 30 characters."),
  ctaHref: z.string().trim().max(300),
  sticky: z.boolean(),
  announcement: z.object({
    enabled: z.boolean(),
    text: z.string().trim().max(160, "The announcement can be up to 160 characters."),
    linkLabel: z.string().trim().max(30, "The announcement link text can be up to 30 characters."),
    href: z.string().trim().max(300),
  }),
  footerColumns: z
    .array(
      z.object({
        id: z.string().max(60),
        title: z.string().trim().min(1, "needs a title.").max(40, "title is too long (up to 40 characters)."),
        links: z.array(child).max(LIMITS.footerLinks, `A footer column can have up to ${LIMITS.footerLinks} links.`),
      }),
    )
    .max(LIMITS.footerColumns, `The footer can have up to ${LIMITS.footerColumns} columns.`),
});

/** "Header menu, link 2 (“Blog”), dropdown link 1" style location for an error. */
function where(path: (string | number)[], input: unknown): string {
  const nav = (input ?? {}) as { links?: { label?: string; children?: { label?: string }[] }[]; footerColumns?: { title?: string; links?: { label?: string }[] }[] };
  const name = (s?: string) => (s ? ` (“${s}”)` : "");
  if (path[0] === "links" && typeof path[1] === "number") {
    const top = nav.links?.[path[1]];
    let s = `Header menu, link ${path[1] + 1}${name(top?.label)}`;
    if (path[2] === "children" && typeof path[3] === "number") s += `, dropdown link ${path[3] + 1}${name(top?.children?.[path[3]]?.label)}`;
    return s;
  }
  if (path[0] === "footerColumns" && typeof path[1] === "number") {
    const col = nav.footerColumns?.[path[1]];
    let s = `Footer column ${path[1] + 1}${name(col?.title)}`;
    if (path[2] === "links" && typeof path[3] === "number") s += `, link ${path[3] + 1}${name(col?.links?.[path[3]]?.label)}`;
    return s;
  }
  return "";
}

/** Checks a menu sent from the admin editor; returns a readable error if something's wrong. */
export function cleanNavigation(input: unknown): { ok: true; nav: NavigationSettings } | { ok: false; error: string } {
  const r = schema.safeParse(input);
  if (!r.success) {
    const issue = r.error.issues[0];
    if (!issue) return { ok: false, error: "Something in the menu isn't valid." };
    const at = where(issue.path, input);
    // e.g. "Footer column 2 (“Policies”), link 3 (“…”): label is too long (up to 60 characters)."
    const msg = issue.message;
    return { ok: false, error: at ? `${at}: ${msg}` : msg.charAt(0).toUpperCase() + msg.slice(1) };
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
        { label: "Get a quote (choose product)", href: "/quote" },
        { label: "Car insurance quote", href: "/quote/auto" },
        { label: "Service contract quote", href: "/quote/vehicle-protection" },
        { label: "Repair costs", href: "/repair-costs" },
        { label: "Why us", href: "/why-us" },
        { label: "FAQ", href: "/faq" },
        { label: "Blog", href: "/blog" },
        { label: "Car insurance by state", href: "/car-insurance" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
        { label: "Do Not Sell or Share My Personal Information", href: "/do-not-sell" },
      ],
    },
    { group: "Your pages", items: pages.map((p) => ({ label: p.status === "published" ? p.title : `${p.title} (draft)`, href: `/${p.slug}` })) },
    { group: "Blog categories", items: categories.map((c) => ({ label: c.name, href: `/blog/category/${c.slug}` })) },
  ].filter((g) => g.items.length);
}
