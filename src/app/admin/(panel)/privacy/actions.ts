"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { findPerson, mask, normalizeIdentity } from "@/lib/privacy";

const back = (q: Record<string, string>) => redirect(`/admin/privacy?${new URLSearchParams(q)}`);

export async function deletePersonData(f: FormData) {
  const me = await requireAdmin("admin");
  const { email, phone } = normalizeIdentity(String(f.get("email") ?? ""), String(f.get("phone") ?? ""));
  if (!email && !phone) back({ error: "Search for a person first." });
  if (String(f.get("confirm") ?? "").trim() !== "DELETE") back({ email, phone, error: "Type DELETE in capitals to confirm." });

  const leads = await findPerson(email, phone);
  await db.lead.deleteMany({ where: { id: { in: leads.map((l) => l.id) } } });
  if (f.get("suppress") === "on") {
    const exists = await db.suppression.findFirst({ where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] } });
    if (!exists) await db.suppression.create({ data: { email: email || null, phone: phone || null, reason: "Deletion request" } });
  }
  // The log keeps proof the request was handled, without keeping the personal data.
  await audit(me.email, "privacy_delete", "person", mask(email, phone), { email: mask(email, ""), phone: mask("", phone), leads: leads.length });
  back({ saved: `Deleted ${leads.length} lead${leads.length === 1 ? "" : "s"} and all related records.` });
}

export async function addSuppression(f: FormData) {
  const me = await requireAdmin("admin");
  const { email, phone } = normalizeIdentity(String(f.get("email") ?? ""), String(f.get("phone") ?? ""));
  if (!email && !phone) back({ error: "Enter a valid email or 10-digit phone number to block." });
  const reason = String(f.get("reason") ?? "").trim().slice(0, 120) || null;
  const type = f.get("type") === "do_not_sell" ? "do_not_sell" : "dnc";
  await db.suppression.create({ data: { email: email || null, phone: phone || null, reason, type } });
  const flagged = await db.lead.updateMany({
    where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    data: type === "do_not_sell" ? { doNotSell: true } : { doNotContact: true },
  });
  await audit(me.email, "dnc_list_added", "person", mask(email, phone), { type, existingLeadsFlagged: flagged.count });
  back({ saved: `Added to the ${type === "do_not_sell" ? "do-not-sell" : "do-not-contact"} list. ${flagged.count} existing lead${flagged.count === 1 ? "" : "s"} flagged.` });
}

/** Moves a privacy request along (in progress, completed, closed) with an internal note. */
export async function updatePrivacyRequest(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const status = String(f.get("status") ?? "");
  if (!["new", "in_progress", "completed", "denied"].includes(status)) back({ error: "Choose a status." });
  const r = await db.privacyRequest.findUnique({ where: { id }, select: { status: true } });
  if (!r) back({ error: "That request no longer exists." });
  const closed = status === "completed" || status === "denied";
  await db.privacyRequest.update({
    where: { id },
    data: { status, staffNote: String(f.get("note") ?? "").trim().slice(0, 1000), completedAt: closed ? new Date() : null },
  });
  await audit(me.email, "privacy_request_updated", "privacy_request", id, { from: r!.status, to: status });
  back({ saved: "Request updated." });
}

export async function removeSuppression(f: FormData) {
  const me = await requireAdmin("admin");
  const entry = await db.suppression.findUnique({ where: { id: String(f.get("id") ?? "") } });
  if (!entry) {
    back({});
    return;
  }
  await db.suppression.delete({ where: { id: entry.id } });
  await audit(me.email, "dnc_list_removed", "person", mask(entry.email ?? "", entry.phone ?? ""));
  back({ saved: "Removed from the do-not-contact list. Existing leads keep their flag until you change it on the lead." });
}
