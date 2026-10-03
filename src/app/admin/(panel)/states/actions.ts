"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";
import { sanitizePostHtml } from "@/lib/blog";
import { db } from "@/lib/db";
import { submitToIndexNow } from "@/lib/indexnow";
import { STATE_RESEARCH, researchFields } from "@/lib/state-guide-research";
import { ensureStateGuides, guidePath, publishProblem } from "@/lib/state-guides";

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
/** "30,000" or "$30000" → 30000; empty → 0. */
const dollars = (f: FormData, k: string) => {
  const n = Number(String(f.get(k) ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 10_000_000) : 0;
};
const on = (f: FormData, k: string) => f.get(k) === "on";

export async function saveStateGuide(f: FormData) {
  const me = await requireAdmin("admin");
  const code = text(f, "code", 2).toUpperCase();
  const old = await db.stateGuide.findUnique({ where: { code } });
  const back = (q: Record<string, string>) => redirect(`/admin/states/${code.toLowerCase()}?${new URLSearchParams(q)}`);
  if (!old) redirect("/admin/states");

  const sourceUrl = text(f, "sourceUrl", 500);
  if (sourceUrl && !/^https:\/\/\S+$/.test(sourceUrl)) back({ error: "The source link must start with https://" });

  const facts = {
    biPerPerson: dollars(f, "biPerPerson"),
    biPerAccident: dollars(f, "biPerAccident"),
    pd: dollars(f, "pd"),
    noFault: on(f, "noFault"),
    pipRequired: on(f, "pipRequired"),
    pipMinimum: dollars(f, "pipMinimum") || null,
    umRequired: on(f, "umRequired"),
    uimRequired: on(f, "uimRequired"),
    medPayRequired: on(f, "medPayRequired"),
    insuranceOptional: on(f, "insuranceOptional"),
    requirementNote: text(f, "requirementNote", 600),
  };
  if (facts.biPerPerson > facts.biPerAccident && facts.biPerAccident > 0) back({ error: "Bodily injury per person can't be more than per accident." });

  // Changing a legal fact needs a fresh check; ticking "Facts checked" records today's date.
  const factsChanged = (Object.keys(facts) as (keyof typeof facts)[]).some((key) => old![key] !== facts[key]) || old!.sourceUrl !== sourceUrl;
  const verifiedAt = on(f, "verified") ? (factsChanged || !old!.verifiedAt ? new Date() : old!.verifiedAt) : null;
  let published = on(f, "published");
  const problem = publishProblem({ verifiedAt, ...facts });
  if (published && problem) published = false;

  const avg = dollars(f, "avgAnnualPremium");
  await db.stateGuide.update({
    where: { code },
    data: {
      ...facts,
      sourceUrl,
      verifiedAt,
      published,
      intro: text(f, "intro", 400),
      contentHtml: sanitizePostHtml(String(f.get("contentHtml") ?? "").slice(0, 200_000)),
      avgAnnualPremium: avg || null,
      premiumSource: text(f, "premiumSource", 200),
      seoTitle: text(f, "seoTitle", 70),
      seoDescription: text(f, "seoDescription", 170),
    },
  });
  await audit(me.email, "state_guide_updated", "state_guide", code, { name: old!.name, published, verified: !!verifiedAt });
  if (published || old!.published) after(() => submitToIndexNow([guidePath(old!), "/car-insurance"], me.email));

  if (on(f, "published") && problem) back({ error: `Saved, but not published: ${problem}` });
  back({ saved: published ? `${old!.name} saved and live on the website.` : `${old!.name} saved (not published).` });
}

/** Publishes or unpublishes one guide from the list. */
export async function setStatePublished(f: FormData) {
  const me = await requireAdmin("admin");
  const code = text(f, "code", 2).toUpperCase();
  const publish = f.get("publish") === "1";
  const g = await db.stateGuide.findUnique({ where: { code } });
  if (!g) redirect("/admin/states");
  if (publish) {
    const problem = publishProblem(g!);
    if (problem) redirect(`/admin/states?${new URLSearchParams({ error: `${g!.name}: ${problem}` })}`);
  }
  await db.stateGuide.update({ where: { code }, data: { published: publish } });
  await audit(me.email, publish ? "state_guide_published" : "state_guide_unpublished", "state_guide", code, { name: g!.name });
  after(() => submitToIndexNow([guidePath(g!), "/car-insurance"], me.email));
  redirect(`/admin/states?${new URLSearchParams({ saved: `${g!.name} ${publish ? "published" : "unpublished"}.` })}`);
}

/** Fills every UNCHECKED state with the researched starting data. Checked states are never touched. */
export async function fillFromResearch() {
  const me = await requireAdmin("admin");
  await ensureStateGuides();
  const unchecked = await db.stateGuide.findMany({ where: { verifiedAt: null }, select: { code: true } });
  let filled = 0;
  for (const { code } of unchecked) {
    const fields = researchFields(code);
    if (!fields) continue;
    await db.stateGuide.update({ where: { code }, data: { ...fields, published: false } });
    filled++;
  }
  await audit(me.email, "state_guide_updated", "state_guide", "*", { filledFromResearch: filled });
  redirect(`/admin/states?${new URLSearchParams({ saved: `Filled ${filled} unchecked state${filled === 1 ? "" : "s"} with the researched starting data. Check each one against its source before publishing.` })}`);
}

/**
 * Refreshes every UNCHECKED state from the confirmed research and ticks "Facts checked".
 * Nothing is published. Already-checked states and unconfirmed research are never touched.
 */
export async function checkConfirmedStates() {
  const me = await requireAdmin("admin");
  await ensureStateGuides();
  const unchecked = await db.stateGuide.findMany({ where: { verifiedAt: null }, select: { code: true } });
  const now = new Date();
  let checked = 0;
  for (const { code } of unchecked) {
    const fields = researchFields(code);
    if (!fields || STATE_RESEARCH[code]?.confidence !== "high") continue;
    await db.stateGuide.update({ where: { code }, data: { ...fields, verifiedAt: now, published: false } });
    checked++;
  }
  await audit(me.email, "state_guide_updated", "state_guide", "*", { checkedFromResearch: checked });
  redirect(`/admin/states?${new URLSearchParams({ saved: `Ticked ${checked} confirmed state${checked === 1 ? "" : "s"} as checked. Click "Publish all checked" to put them live.` })}`);
}

/** Publishes every guide whose facts have been checked. */
export async function publishAllChecked() {
  const me = await requireAdmin("admin");
  const ready = await db.stateGuide.findMany({
    where: { published: false, verifiedAt: { not: null }, OR: [{ biPerPerson: { gt: 0 } }, { pd: { gt: 0 } }] },
    select: { code: true, slug: true },
  });
  if (ready.length) {
    await db.stateGuide.updateMany({ where: { code: { in: ready.map((r) => r.code) } }, data: { published: true } });
    await audit(me.email, "state_guide_published", "state_guide", "*", { count: ready.length });
    after(() => submitToIndexNow([...ready.map(guidePath), "/car-insurance"], me.email));
  }
  redirect(`/admin/states?${new URLSearchParams({ saved: ready.length ? `Published ${ready.length} state guide${ready.length === 1 ? "" : "s"}.` : "No checked guides waiting to be published." })}`);
}
