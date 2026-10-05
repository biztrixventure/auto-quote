import { NextResponse, after } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { audit } from "@/lib/audit";
import { sanitizePostHtml } from "@/lib/blog";
import { apiError, json, readJson } from "@/lib/blog-api";
import { db } from "@/lib/db";
import { submitToIndexNow } from "@/lib/indexnow";
import { site } from "@/lib/site";
import { guidePath, publishProblem } from "@/lib/state-guides";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

// The legal facts shown on a state guide. Changing any of them needs "verified": true, meaning
// the values were just checked against the official source; that also updates "last checked".
const FACT_INTS = ["biPerPerson", "biPerAccident", "pd"] as const;
const FACT_BOOLS = ["noFault", "pipRequired", "umRequired", "uimRequired", "medPayRequired", "insuranceOptional"] as const;

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const dollars = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 10_000_000) : null;
};

async function load(code: string) {
  return db.stateGuide.findUnique({ where: { code: code.toUpperCase().slice(0, 2) } });
}

/** One state guide, with all its fields. Admin keys only. */
export async function GET(req: Request, { params }: Ctx) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  if (!caller.editor) return apiError(403, "Only an admin key can read state guides");
  const g = await load((await params).code);
  if (!g) return apiError(404, "State not found");
  return json({ state: { ...g, url: `${site.url}${guidePath(g)}` } });
}

/**
 * Updates a state guide. Content fields (intro, contentHtml, seoTitle, seoDescription, avgAnnualPremium,
 * premiumSource) can change freely. Legal facts (limits, PIP, UM/UIM, no-fault, requirementNote, sourceUrl)
 * need "verified": true. Optional "published": true/false. Requires an admin key that can publish.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const caller = await authenticateApiKey(req);
  if (caller instanceof NextResponse) return caller;
  if (!caller.editor || !caller.canPublish) return apiError(403, "Only an admin key that can publish may change state guides");
  const old = await load((await params).code);
  if (!old) return apiError(404, "State not found");
  const body = await readJson(req, 300_000);
  if (body instanceof NextResponse) return body;

  const data: Record<string, unknown> = {};
  // Content
  if (body.intro !== undefined) data.intro = clean(body.intro, 400);
  if (body.contentHtml !== undefined) {
    if (String(body.contentHtml).length > 200_000) return apiError(413, "contentHtml is too long");
    data.contentHtml = sanitizePostHtml(String(body.contentHtml ?? ""));
  }
  if (body.seoTitle !== undefined) data.seoTitle = clean(body.seoTitle, 70);
  if (body.seoDescription !== undefined) data.seoDescription = clean(body.seoDescription, 170);
  if (body.premiumSource !== undefined) data.premiumSource = clean(body.premiumSource, 200);
  if (body.avgAnnualPremium !== undefined) data.avgAnnualPremium = body.avgAnnualPremium === null ? null : dollars(body.avgAnnualPremium);
  if (data.avgAnnualPremium && !(data.premiumSource ?? old.premiumSource)) return apiError(400, "An average premium needs a premiumSource");

  // Legal facts
  const facts: Record<string, unknown> = {};
  for (const k of FACT_INTS) if (body[k] !== undefined) facts[k] = dollars(body[k]) ?? 0;
  for (const k of FACT_BOOLS) if (body[k] !== undefined) facts[k] = !!body[k];
  if (body.pipMinimum !== undefined) facts.pipMinimum = body.pipMinimum === null ? null : dollars(body.pipMinimum) || null;
  if (body.requirementNote !== undefined) facts.requirementNote = clean(body.requirementNote, 600);
  if (body.sourceUrl !== undefined) {
    const url = clean(body.sourceUrl, 500);
    if (url && !/^https:\/\/\S+$/.test(url)) return apiError(400, "sourceUrl must start with https://");
    facts.sourceUrl = url;
  }
  const changedFacts = Object.keys(facts).filter((k) => (old as Record<string, unknown>)[k] !== facts[k]);
  if (changedFacts.length && body.verified !== true) {
    return apiError(400, `Changing ${changedFacts.join(", ")} needs "verified": true after checking the official source`);
  }
  Object.assign(data, facts);
  if (body.verified === true) data.verifiedAt = new Date();

  const merged = { ...old, ...data } as typeof old;
  if (merged.biPerPerson > merged.biPerAccident && merged.biPerAccident > 0) return apiError(400, "Bodily injury per person can't be more than per accident");
  if (body.published !== undefined) {
    const publish = !!body.published;
    if (publish) {
      const problem = publishProblem(merged);
      if (problem) return apiError(400, problem);
    }
    data.published = publish;
  }
  if (!Object.keys(data).length) return apiError(400, "Nothing to change");

  const g = await db.stateGuide.update({ where: { code: old.code }, data });
  const actor = caller.saver.actor ?? caller.saver.email;
  await audit(actor, "state_guide_updated", "state_guide", g.code, { name: g.name, fields: Object.keys(data), published: g.published });
  if (g.published || old.published) after(() => submitToIndexNow([guidePath(g), "/car-insurance"], actor));
  return json({ message: g.published ? `${g.name} saved and live.` : `${g.name} saved (not published).`, state: { ...g, url: `${site.url}${guidePath(g)}` } });
}
