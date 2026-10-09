import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { audit } from "@/lib/audit";
import { sanitizePostHtml } from "@/lib/blog";
import { apiError, json, readJson } from "@/lib/blog-api";
import { db } from "@/lib/db";
import { DEFAULT_PRIVACY_HTML, DEFAULT_TERMS_HTML } from "@/lib/legal-templates";
import { cleanNavigation } from "@/lib/menus";
import { getSettings, saveSetting, type ContentSettings, type LegalSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Site settings that the admin edits in Menus, Legal & privacy and Content, readable and
// changeable with an admin API key that can publish. Every change is checked the same way the
// admin forms check it and is written to the activity log.
//   GET  /api/blog-api/v1/settings/navigation   header + footer menus
//   PUT  /api/blog-api/v1/settings/navigation   the whole menu object (same shape as GET)
//   GET  /api/blog-api/v1/settings/legal        privacy policy and terms (HTML) + dates
//   PATCH /api/blog-api/v1/settings/legal       { privacyHtml?, termsHtml?, reset?: "privacy" | "terms" | "both" }
//   GET  /api/blog-api/v1/settings/content      homepage hero, why-us intro and reasons, FAQs
//   PATCH /api/blog-api/v1/settings/content     any of { hero, whyIntro, reasons, faqs }

type Ctx = { params: Promise<{ section: string }> };
const SECTIONS = ["navigation", "legal", "content"] as const;
type Section = (typeof SECTIONS)[number];

const text = (v: unknown, max: number) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);

async function caller(req: Request, write: boolean) {
  const c = await authenticateApiKey(req);
  if (c instanceof NextResponse) return c;
  if (!c.editor) return apiError(403, "Only an admin key can use site settings");
  if (write && !c.canPublish) return apiError(403, "Only an admin key that can publish may change site settings");
  return c;
}

async function section(ctx: Ctx): Promise<Section | null> {
  const s = (await ctx.params).section;
  return (SECTIONS as readonly string[]).includes(s) ? (s as Section) : null;
}

// Whether the setting was ever saved in the admin; if not, the site uses the built-in defaults.
const saved = async (key: Section) => !!(await db.setting.findUnique({ where: { key }, select: { key: true } }));

export async function GET(req: Request, ctx: Ctx) {
  const c = await caller(req, false);
  if (c instanceof NextResponse) return c;
  const s = await section(ctx);
  if (!s) return apiError(404, `Unknown section. Use one of: ${SECTIONS.join(", ")}`);
  const settings = await getSettings();
  if (s === "navigation") return json({ saved: await saved(s), navigation: settings.navigation });
  if (s === "legal") {
    const l = settings.legal;
    return json({
      saved: await saved(s),
      legal: { ...l, privacyIsDefault: l.privacyHtml === DEFAULT_PRIVACY_HTML, termsIsDefault: l.termsHtml === DEFAULT_TERMS_HTML },
    });
  }
  const { hero, whyIntro, reasons, faqs } = settings.content;
  return json({ saved: await saved(s), content: { hero, whyIntro, reasons, faqs } });
}

export async function PUT(req: Request, ctx: Ctx) {
  const c = await caller(req, true);
  if (c instanceof NextResponse) return c;
  if ((await section(ctx)) !== "navigation") return apiError(405, "PUT is only for navigation; use PATCH for legal and content");
  const body = await readJson(req, 100_000);
  if (body instanceof NextResponse) return body;
  const r = cleanNavigation(body.navigation ?? body);
  if (!r.ok) return apiError(400, r.error);
  await saveSetting("navigation", r.nav);
  await audit(c.saver.actor ?? c.saver.email, "menus_updated", "setting", "navigation", { via: "api" });
  return json({ message: "Menus saved. They're live on the website.", navigation: r.nav });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const c = await caller(req, true);
  if (c instanceof NextResponse) return c;
  const s = await section(ctx);
  if (s !== "legal" && s !== "content") return apiError(405, "PATCH is for legal and content; use PUT for navigation");
  const body = await readJson(req, 400_000);
  if (body instanceof NextResponse) return body;
  const actor = c.saver.actor ?? c.saver.email;
  const settings = await getSettings();

  if (s === "legal") {
    const old = settings.legal;
    const reset = String(body.reset ?? "");
    let privacyHtml = reset === "privacy" || reset === "both" ? DEFAULT_PRIVACY_HTML : body.privacyHtml !== undefined ? sanitizePostHtml(String(body.privacyHtml)) : old.privacyHtml;
    let termsHtml = reset === "terms" || reset === "both" ? DEFAULT_TERMS_HTML : body.termsHtml !== undefined ? sanitizePostHtml(String(body.termsHtml)) : old.termsHtml;
    if (!privacyHtml.replace(/<[^>]+>/g, "").trim() || !termsHtml.replace(/<[^>]+>/g, "").trim()) return apiError(400, "The Privacy Policy and Terms of Use can't be empty");
    privacyHtml = privacyHtml.slice(0, 300_000);
    termsHtml = termsHtml.slice(0, 300_000);
    const changed = privacyHtml !== old.privacyHtml || termsHtml !== old.termsHtml;
    const next: LegalSettings = {
      ...old,
      privacyHtml,
      termsHtml,
      privacyUpdated: privacyHtml !== old.privacyHtml ? today() : old.privacyUpdated,
      termsUpdated: termsHtml !== old.termsHtml ? today() : old.termsUpdated,
      // New wording needs a fresh attorney review.
      reviewed: changed ? false : old.reviewed,
    };
    await saveSetting("legal", next);
    await audit(actor, "legal_updated", "setting", "legal", { via: "api", privacyChanged: next.privacyUpdated !== old.privacyUpdated, termsChanged: next.termsUpdated !== old.termsUpdated });
    return json({ message: changed ? "Legal pages saved. They're live on the website." : "No change.", legal: { privacyUpdated: next.privacyUpdated, termsUpdated: next.termsUpdated, reviewed: next.reviewed } });
  }

  // content
  const patch: Partial<ContentSettings> = {};
  if (body.hero !== undefined) {
    const h = body.hero as Record<string, unknown>;
    const hero = { eyebrow: text(h?.eyebrow, 60), title: text(h?.title, 90), subtitle: text(h?.subtitle, 240) };
    if (!hero.title) return apiError(400, "hero.title can't be empty");
    patch.hero = hero;
  }
  if (body.whyIntro !== undefined) patch.whyIntro = text(body.whyIntro, 800);
  if (body.reasons !== undefined) {
    if (!Array.isArray(body.reasons)) return apiError(400, "reasons must be a list of { title, body }");
    const reasons = body.reasons.slice(0, 12).map((r: Record<string, unknown>) => ({ title: text(r?.title, 60), body: text(r?.body, 400) })).filter((r) => r.title && r.body);
    if (!reasons.length) return apiError(400, "Keep at least one reason");
    patch.reasons = reasons;
  }
  if (body.faqs !== undefined) {
    if (!Array.isArray(body.faqs)) return apiError(400, "faqs must be a list of { q, a }");
    const faqs = body.faqs.slice(0, 20).map((f: Record<string, unknown>) => ({ q: text(f?.q, 160), a: text(f?.a, 1200) })).filter((f) => f.q && f.a);
    if (!faqs.length) return apiError(400, "Keep at least one question and answer");
    patch.faqs = faqs;
  }
  if (!Object.keys(patch).length) return apiError(400, "Nothing to change. Send hero, whyIntro, reasons or faqs");
  await saveSetting("content", { ...settings.content, ...patch });
  await audit(actor, "content_updated", "setting", "content", { via: "api", fields: Object.keys(patch) });
  return json({ message: "Content saved. It's live on the website.", fields: Object.keys(patch) });
}
