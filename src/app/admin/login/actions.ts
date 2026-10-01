"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { completeMfa, createSession, destroySession, getSession, hashPassword, verifyPassword, verifyTotp } from "@/lib/auth";
import { db } from "@/lib/db";
import { peekLimit, rateLimit, resetLimit } from "@/lib/rate-limit";
import { clientIp, safeEqual } from "@/lib/security";

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const GENERIC = "That email and password don't match. Try again.";

// Only allow returning to admin pages, never to another site.
const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/admin") && !s.startsWith("//") && !s.includes("\\") ? s : "/admin";
};
const back = (q: Record<string, string>) => redirect(`/admin/login?${new URLSearchParams(q)}`);

// Spends the same time as a real check when the account doesn't exist, so timing can't reveal valid emails.
const DUMMY_HASH = hashPassword("timing-equaliser-password");

export async function signIn(f: FormData) {
  const identifier = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(f.get("password") ?? "").slice(0, 200);
  const next = safeNext(f.get("next"));
  const ipKey = `login:ip:${clientIp(await headers())}`;
  const idKey = `login:id:${identifier}`;

  if (peekLimit(ipKey, MAX_FAILURES).blocked || peekLimit(idKey, MAX_FAILURES).blocked) {
    back({ error: "Too many failed attempts. Wait 15 minutes and try again.", next });
  }
  if (!identifier || !password) back({ error: "Enter your email and password.", next });

  let user = await db.adminUser.findUnique({ where: { email: identifier } });

  // First run: no accounts yet, so the .env credentials create the owner account once.
  if (!user && (await db.adminUser.count()) === 0) {
    const envUser = (process.env.ADMIN_USER ?? "").toLowerCase();
    const envPass = process.env.ADMIN_PASSWORD ?? "";
    if (envUser && envPass && (await safeEqual(identifier, envUser)) && (await safeEqual(password, envPass))) {
      user = await db.adminUser.create({ data: { email: envUser, name: "Owner", role: "owner", passwordHash: await hashPassword(password) } });
      await audit(user.email, "owner_created", "user", user.id);
    }
  }

  let ok = false;
  if (user) ok = user.active && (await verifyPassword(password, user.passwordHash));
  else await verifyPassword(password, await DUMMY_HASH);

  if (!user || !ok) {
    rateLimit(ipKey, MAX_FAILURES, WINDOW_MS);
    rateLimit(idKey, MAX_FAILURES, WINDOW_MS);
    if (user) await audit(user.email, "sign_in_failed", "user", user.id);
    back({ error: GENERIC, next });
    return;
  }

  resetLimit(idKey);
  await createSession(user.id, user.totpEnabled);
  if (user.totpEnabled) back({ step: "code", next });

  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.email, "signed_in", "user", user.id);
  // Admins and owners without two-factor are sent to set it up.
  redirect(user.role !== "agent" && !user.totpEnabled ? "/admin/account?setup2fa=1" : next);
}

export async function verifyCode(f: FormData) {
  const next = safeNext(f.get("next"));
  const session = await getSession();
  if (!session || !session.mfaPending) {
    back({ next });
    return;
  }
  const key = `login:2fa:${session.userId}`;
  if (peekLimit(key, MAX_FAILURES).blocked) {
    await destroySession();
    back({ error: "Too many wrong codes. Sign in again in 15 minutes.", next });
  }
  if (!session.user.totpSecret || !verifyTotp(session.user.totpSecret, String(f.get("code") ?? ""))) {
    rateLimit(key, MAX_FAILURES, WINDOW_MS);
    await audit(session.user.email, "2fa_failed", "user", session.userId);
    back({ step: "code", error: "That code didn't work. Check your app and try again.", next });
  }
  resetLimit(key);
  await completeMfa(session.id);
  await db.adminUser.update({ where: { id: session.userId }, data: { lastLoginAt: new Date() } });
  await audit(session.user.email, "signed_in", "user", session.userId, { twoFactor: true });
  redirect(next);
}

export async function cancelSignIn() {
  await destroySession();
  redirect("/admin/login");
}
