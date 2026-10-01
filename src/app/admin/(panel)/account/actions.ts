"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { destroyOtherSessions, hashPassword, newTotpSecret, passwordProblem, verifyPassword, verifyTotp } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

const back = (q: Record<string, string>) => redirect(`/admin/account?${new URLSearchParams(q)}`);
const val = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function updateName(f: FormData) {
  const me = await requireAdmin("writer");
  const name = val(f, "name").trim().slice(0, 80);
  if (!name) back({ error: "Enter your name." });
  // Author bio and photo (shown under blog posts); only sent by people who use the blog.
  const profile: { bio?: string; avatarId?: string | null } = {};
  if (f.has("bio")) profile.bio = val(f, "bio").replace(/\s+/g, " ").trim().slice(0, 400);
  if (f.has("avatarId")) {
    const id = val(f, "avatarId");
    profile.avatarId = id && (await db.media.findUnique({ where: { id }, select: { id: true } })) ? id : null;
  }
  await db.adminUser.update({ where: { id: me.id }, data: { name, ...profile } });
  if (Object.keys(profile).length) await audit(me.email, "profile_updated", "user", me.id);
  back({ saved: "Profile saved." });
}

export async function changePassword(f: FormData) {
  const me = await requireAdmin("writer");
  const current = val(f, "current");
  const next = val(f, "password");
  if (!(await verifyPassword(current, me.passwordHash))) back({ error: "Your current password is wrong." });
  const problem = passwordProblem(next);
  if (problem) back({ error: `New password: ${problem}` });
  if (next !== val(f, "confirm")) back({ error: "The new passwords don't match." });
  await db.adminUser.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  await destroyOtherSessions(me.id);
  await audit(me.email, "password_changed", "user", me.id);
  back({ saved: "Password changed. You've been signed out everywhere else." });
}

export async function startTwoFactor() {
  const me = await requireAdmin("writer");
  if (me.totpEnabled) back({});
  await db.adminUser.update({ where: { id: me.id }, data: { totpSecret: newTotpSecret() } });
  back({ setup2fa: "1" });
}

export async function confirmTwoFactor(f: FormData) {
  const me = await requireAdmin("writer");
  if (!me.totpSecret || me.totpEnabled) back({});
  if (!verifyTotp(me.totpSecret!, val(f, "code"))) back({ setup2fa: "1", error: "That code didn't match. Make sure your phone's time is correct and try the newest code." });
  await db.adminUser.update({ where: { id: me.id }, data: { totpEnabled: true } });
  await destroyOtherSessions(me.id);
  await audit(me.email, "2fa_enabled", "user", me.id);
  back({ saved: "Two-factor sign-in is on. You'll be asked for a code each time you sign in." });
}

export async function disableTwoFactor(f: FormData) {
  const me = await requireAdmin("writer");
  if (!(await verifyPassword(val(f, "password"), me.passwordHash))) back({ error: "Your password is wrong." });
  if (!me.totpSecret || !verifyTotp(me.totpSecret, val(f, "code"))) back({ error: "That code didn't work." });
  await db.adminUser.update({ where: { id: me.id }, data: { totpEnabled: false, totpSecret: null } });
  await audit(me.email, "2fa_disabled", "user", me.id);
  back({ saved: "Two-factor sign-in is off." });
}

export async function signOutEverywhereElse() {
  const me = await requireAdmin("writer");
  await destroyOtherSessions(me.id);
  await audit(me.email, "sessions_revoked", "user", me.id);
  back({ saved: "Signed out of every other browser and device." });
}
