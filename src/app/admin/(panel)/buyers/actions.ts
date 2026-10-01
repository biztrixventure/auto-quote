"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { postToBuyer } from "@/lib/integrations/distribution";
import { assertPublicHttpsUrl } from "@/lib/outbound";
import { STATE_CODES } from "@/lib/states";

const back = (q: Record<string, string>) => redirect(`/admin/buyers?${new URLSearchParams(q)}`);

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  webhookUrl: z.string().trim().url().max(500),
  minPrice: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).max(1000).nullable()),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export async function saveBuyer(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const again: Record<string, string> = id ? { edit: id } : { new: "1" };
  const parsed = schema.safeParse(Object.fromEntries(f));
  if (!parsed.success) {
    back({ ...again, error: "Enter a name and a valid https address. Minimum price must be 0–1000." });
    return;
  }
  const d = parsed.data;
  try {
    await assertPublicHttpsUrl(d.webhookUrl);
  } catch (e) {
    back({ ...again, error: `Address: ${(e as Error).message}.` });
  }
  const states = f.getAll("states").map(String).filter((s) => STATE_CODES.includes(s));
  const authHeader = String(f.get("authHeader") ?? "").trim().slice(0, 500);
  const data = {
    name: d.name,
    webhookUrl: d.webhookUrl,
    minPrice: d.minPrice,
    sortOrder: d.sortOrder,
    states: f.get("allStates") === "on" || states.length === STATE_CODES.length ? "" : states.join(","),
    active: f.get("active") === "on",
    // A blank key field keeps the saved key, so it never has to be shown again.
    ...(authHeader ? { authHeader } : f.get("clearKey") === "on" ? { authHeader: null } : {}),
  };
  const buyer = id ? await db.leadBuyer.update({ where: { id }, data }) : await db.leadBuyer.create({ data });
  await audit(me.email, id ? "buyer_updated" : "buyer_created", "buyer", buyer.id, { name: buyer.name });
  revalidatePath("/admin/buyers");
  back({ saved: `${buyer.name} saved.` });
}

export async function toggleBuyer(f: FormData) {
  const me = await requireAdmin("admin");
  const buyer = await db.leadBuyer.findUnique({ where: { id: String(f.get("id") ?? "") } });
  if (!buyer) return;
  await db.leadBuyer.update({ where: { id: buyer.id }, data: { active: !buyer.active } });
  await audit(me.email, buyer.active ? "buyer_paused" : "buyer_activated", "buyer", buyer.id, { name: buyer.name });
  revalidatePath("/admin/buyers");
}

export async function deleteBuyer(f: FormData) {
  const me = await requireAdmin("admin");
  const buyer = await db.leadBuyer.findUnique({ where: { id: String(f.get("id") ?? "") } });
  if (!buyer) return;
  await db.leadBuyer.delete({ where: { id: buyer.id } });
  await audit(me.email, "buyer_deleted", "buyer", buyer.id, { name: buyer.name });
  back({ saved: `${buyer.name} deleted.` });
}

export async function testBuyer(f: FormData) {
  const me = await requireAdmin("admin");
  const buyer = await db.leadBuyer.findUnique({ where: { id: String(f.get("id") ?? "") } });
  if (!buyer) return;
  const sample = {
    test: true,
    lead_id: "test",
    first_name: "Test",
    last_name: "Lead",
    email: "test@example.com",
    phone: "5555550100",
    city: "Austin",
    state: "TX",
    zip: "73301",
    coverage_level: "standard",
    driver: { dob: "1988-01-15", gender: "female", marital_status: "married", license_status: "valid", accidents: 0, violations: 0 },
    vehicle: { year: 2020, make: "Honda", model: "Civic", ownership: "own", primary_use: "commute", annual_miles: 10000 },
  };
  let message: string;
  try {
    const r = await postToBuyer(buyer.webhookUrl, sample, buyer.authHeader);
    message = r.accepted ? `accepted${r.price ? ` at $${r.price}` : ""}` : `rejected (${JSON.stringify(r.raw).slice(0, 140)})`;
  } catch (e) {
    message = `failed: ${String(e).slice(0, 140)}`;
  }
  await audit(me.email, "buyer_tested", "buyer", buyer.id, { name: buyer.name, result: message });
  back(message.startsWith("accepted") ? { saved: `Test lead to ${buyer.name}: ${message}` } : { error: `Test lead to ${buyer.name}: ${message}` });
}
