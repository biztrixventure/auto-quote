"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettings, saveSetting, type ContentSettings } from "@/lib/settings";

const back = (section: string, q: Record<string, string>) => redirect(`/admin/content?${new URLSearchParams(q)}#${section}`);
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

async function save(section: string, label: string, email: string, patch: Partial<ContentSettings>) {
  const { content } = await getSettings();
  const next = { ...content, ...patch };
  await saveSetting("content", next);
  await audit(email, "content_updated", "setting", "content", { section });
  back(section, { saved: `${label} saved. It's live on the website.` });
}

/** Reads numbered rows (e.g. faq_q_0, faq_a_0 …) and drops empty ones. */
function rows<T>(f: FormData, prefix: string, max: number, read: (i: number) => T | null): T[] {
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    if (!f.has(`${prefix}_${i}`)) continue;
    const row = read(i);
    if (row) out.push(row);
  }
  return out;
}

export async function saveHero(f: FormData) {
  const me = await requireAdmin("admin");
  const hero = { eyebrow: text(f, "eyebrow", 60), title: text(f, "title", 90), subtitle: text(f, "subtitle", 240) };
  if (!hero.title) back("hero", { error: "The headline can't be empty." });
  await save("hero", "Homepage hero", me.email, { hero });
}

export async function saveWhy(f: FormData) {
  const me = await requireAdmin("admin");
  const reasons = rows(f, "reason_title", 12, (i) => {
    const title = text(f, `reason_title_${i}`, 60);
    const body = text(f, `reason_body_${i}`, 400);
    return title && body ? { title, body } : null;
  });
  if (reasons.length < 1) back("why", { error: "Keep at least one slide (a title and text)." });
  await save("why", "Why choose us", me.email, { whyIntro: text(f, "whyIntro", 800), reasons });
}

export async function saveFaqs(f: FormData) {
  const me = await requireAdmin("admin");
  const faqs = rows(f, "faq_q", 20, (i) => {
    const q = text(f, `faq_q_${i}`, 160);
    const a = text(f, `faq_a_${i}`, 1200);
    return q && a ? { q, a } : null;
  });
  if (faqs.length < 1) back("faqs", { error: "Keep at least one question and answer." });
  await save("faqs", "FAQs", me.email, { faqs });
}

export async function saveRepairCosts(f: FormData) {
  const me = await requireAdmin("admin");
  const { content } = await getSettings();
  const repairCosts: Record<string, string> = {};
  for (const part of Object.keys(content.repairCosts)) {
    const v = text(f, `cost_${part}`, 24);
    if (!v) back("repair", { error: `Enter a price for ${part}.` });
    repairCosts[part] = v;
  }
  await save("repair", "Repair prices", me.email, { repairCosts });
}

export async function saveReviews(f: FormData) {
  const me = await requireAdmin("admin");
  const url = (v: string) => (v === "" || /^https:\/\/\S+$/.test(v) ? v : null);
  const items = rows(f, "rev_name", 12, (i) => {
    const name = text(f, `rev_name_${i}`, 60);
    const body = text(f, `rev_text_${i}`, 600);
    if (!name || !body) return null;
    const rating = Math.min(5, Math.max(1, Number(f.get(`rev_rating_${i}`)) || 5));
    const title = text(f, `rev_title_${i}`, 100);
    return { name, location: text(f, `rev_location_${i}`, 60), date: text(f, `rev_date_${i}`, 30), rating, text: body, ...(title ? { title } : {}) };
  });
  const theme = f.get("theme") === "google" ? ("google" as const) : ("trustpilot" as const);
  const autoplaySeconds = Math.min(30, Math.max(0, Math.round(Number(f.get("autoplaySeconds")) || 0)));
  const platform = text(f, "platform", 60);
  const summaryUrl = url(text(f, "summaryUrl", 300));
  const awardUrl = url(text(f, "awardUrl", 300));
  if (summaryUrl === null || awardUrl === null) back("reviews", { error: "Links must start with https://" });
  const rating = Number(f.get("summaryRating"));
  const count = Number(f.get("summaryCount"));
  const summary = platform && rating >= 1 && rating <= 5 && count > 0 ? { platform, rating, count: Math.round(count), url: summaryUrl! } : null;
  const awardText = text(f, "awardText", 120);
  const award = awardText && awardUrl ? { text: awardText, url: awardUrl } : null;
  await save("reviews", "Reviews", me.email, { reviews: { theme, autoplaySeconds, summary, items, award } });
}

/** A site path like /blog or /#faq, or a full https:// address. */
const linkOk = (v: string) => (v.startsWith("/") && !v.startsWith("//") && !/\s/.test(v)) || /^https:\/\/\S+$/.test(v);

export async function saveNavigation(f: FormData) {
  const me = await requireAdmin("admin");
  let bad = "";
  const links = rows(f, "nav_label", 10, (i) => {
    const label = text(f, `nav_label_${i}`, 30);
    const href = text(f, `nav_href_${i}`, 300);
    if (!label && !href) return null;
    if (!label || !linkOk(href)) bad = label || href;
    return { label, href };
  });
  const ctaLabel = text(f, "ctaLabel", 30);
  const ctaHref = text(f, "ctaHref", 300) || "/quote/auto";
  if (bad || (ctaLabel && !linkOk(ctaHref))) {
    back("navigation", { error: `Check the link "${bad || ctaLabel}": use a page path like /blog or a full https:// address.` });
  }
  await saveSetting("navigation", { links, showPhone: f.get("showPhone") === "on", ctaLabel, ctaHref });
  await audit(me.email, "content_updated", "setting", "navigation", { section: "navigation" });
  back("navigation", { saved: "Navigation saved. It's live on the website." });
}
