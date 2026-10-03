"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { createApiKey } from "@/lib/api-keys";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export type NewKeyState = { ok?: string; token?: string; error?: string };

/** Creates a key that acts as the signed-in admin. The key is returned once and never stored. */
export async function createKey(_prev: NewKeyState, f: FormData): Promise<NewKeyState> {
  const me = await requireAdmin("admin");
  const name = String(f.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (name.length < 2) return { error: "Give the key a name, e.g. “Claude blog writer”." };
  const canPublish = f.get("canPublish") === "on";
  const active = await db.apiKey.count({ where: { userId: me.id, revokedAt: null } });
  if (active >= 10) return { error: "You already have 10 active keys. Revoke one first." };
  const { id, token } = await createApiKey(me.id, name, canPublish);
  await audit(me.email, "api_key_created", "api_key", id, { name, canPublish });
  return { ok: `Key “${name}” created.`, token };
}

export async function revokeKey(f: FormData) {
  const me = await requireAdmin("admin");
  const id = String(f.get("id") ?? "");
  const key = await db.apiKey.findUnique({ where: { id }, select: { id: true, name: true, userId: true, revokedAt: true } });
  // Admins revoke their own keys; owners can revoke anyone's.
  if (key && !key.revokedAt && (key.userId === me.id || me.role === "owner")) {
    await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    await audit(me.email, "api_key_revoked", "api_key", id, { name: key.name });
  }
  redirect(`/admin/api-keys?${new URLSearchParams({ saved: "Key revoked. It stops working immediately." })}`);
}
