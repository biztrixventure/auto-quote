"use server";

import { requireAdmin } from "@/lib/admin-guard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { STATE_CODES } from "@/lib/states";

const COVERAGES = ["state_minimum", "standard", "premium"];
const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().int().min(min).max(max).nullable());
const link = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v) || /^\/\S*$/.test(v), "must start with https:// (or / for an image in this site)");

const schema = z.object({
  name: z.string().trim().min(1, "is required").max(80),
  tagline: z.string().trim().max(80),
  logoUrl: link,
  bindUrl: link,
  priceFactor: z.coerce.number().min(0.1, "must be at least 0.1").max(5, "must be 5 or less"),
  sortOrder: z.coerce.number().int().min(0).max(999),
  minAge: optionalInt(16, 100),
  maxAge: optionalInt(16, 120),
  maxAccidents: optionalInt(0, 20),
  maxViolations: optionalInt(0, 20),
});

const NAMES: Record<string, string> = {
  name: "Name",
  tagline: "Tagline",
  logoUrl: "Logo URL",
  bindUrl: "Buy online link",
  priceFactor: "Price factor",
  sortOrder: "Display order",
  minAge: "Minimum age",
  maxAge: "Maximum age",
  maxAccidents: "Most accidents",
  maxViolations: "Most violations",
};

const done = (saved: string) => {
  revalidatePath("/admin/partners");
  revalidatePath("/admin/pricing");
  redirect(`/admin/partners?${new URLSearchParams({ saved })}`);
};

export async function savePartner(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const back = id ? `/admin/partners/${id}` : "/admin/partners/new";
  const fail = (error: string) => redirect(`${back}?${new URLSearchParams({ error })}`);

  const parsed = schema.safeParse(Object.fromEntries(f));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(`${NAMES[String(issue.path[0])] ?? issue.path[0]} ${issue.message.toLowerCase()}.`);
  }
  const d = parsed.data;
  if (d.minAge !== null && d.maxAge !== null && d.minAge > d.maxAge) return fail("Minimum age can't be higher than maximum age.");

  const allStates = f.get("allStates") === "on";
  const states = f.getAll("states").map(String).filter((s) => STATE_CODES.includes(s));
  const coverage = f.getAll("coverageLevels").map(String).filter((c) => COVERAGES.includes(c));
  if (!allStates && states.length === 0) return fail("Choose at least one state, or tick “All states”.");
  if (coverage.length === 0) return fail("Choose at least one coverage level.");

  const data = {
    name: d.name,
    tagline: d.tagline || null,
    logoUrl: d.logoUrl || null,
    bindUrl: d.bindUrl || null,
    priceFactor: d.priceFactor,
    sortOrder: d.sortOrder,
    // Empty means every state, so newly added states are covered automatically.
    states: allStates || states.length === STATE_CODES.length ? "" : states.join(","),
    coverageLevels: coverage.join(","),
    minAge: d.minAge,
    maxAge: d.maxAge,
    maxAccidents: d.maxAccidents,
    maxViolations: d.maxViolations,
    acceptsUninsured: f.get("acceptsUninsured") === "on",
    active: f.get("active") === "on",
  };

  const partner = id ? await db.partner.update({ where: { id }, data }) : await db.partner.create({ data });
  await audit(me.email, id ? "partner_updated" : "partner_created", "partner", partner.id, { name: partner.name });
  done(`${partner.name} saved.`);
}

export async function togglePartner(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) return done("Partner not found.");
  await db.partner.update({ where: { id }, data: { active: !partner.active } });
  await audit(me.email, partner.active ? "partner_paused" : "partner_activated", "partner", id, { name: partner.name });
  done(`${partner.name} ${partner.active ? "is hidden from" : "is now shown in"} quote results.`);
}

export async function deletePartner(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) return done("Partner not found.");
  await db.partner.delete({ where: { id } });
  await audit(me.email, "partner_deleted", "partner", id, { name: partner.name });
  done(`${partner.name} deleted. Past quotes from this partner stay on their leads.`);
}
