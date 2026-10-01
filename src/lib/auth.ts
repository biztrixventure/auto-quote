import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import type { AdminUser } from "@prisma/client";
import { db } from "./db";
import { clientIp } from "./security";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;

// ── Roles ──────────────────────────────────────────────────────
export const ROLES = { agent: "Agent", admin: "Admin", owner: "Owner" } as const;
export type Role = keyof typeof ROLES;
const RANK: Record<Role, number> = { agent: 1, admin: 2, owner: 3 };
export const hasRole = (user: Pick<AdminUser, "role">, min: Role) => (RANK[user.role as Role] ?? 0) >= RANK[min];

// ── Passwords (scrypt) ─────────────────────────────────────────
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Password rules shown to users: 12+ characters, not just letters or just digits. */
export function passwordProblem(password: string) {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 200) return "Use 200 characters or fewer.";
  if (/^[a-z]+$/i.test(password) || /^\d+$/.test(password)) return "Mix letters with numbers or symbols.";
  return null;
}

export function randomPassword() {
  return randomBytes(12).toString("base64url"); // 16 characters
}

// ── Two-factor codes (TOTP, RFC 6238) ──────────────────────────
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string) {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of str.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

function totpAt(secret: string, counter: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString();
  return code.padStart(6, "0");
}

/** Accepts the current code and one step either side, to allow for clock drift. */
export function verifyTotp(secret: string, code: string) {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((d) => timingSafeEqual(Buffer.from(totpAt(secret, now + d)), Buffer.from(clean)));
}

export const totpUri = (secret: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// ── Sessions ───────────────────────────────────────────────────
export const SESSION_COOKIE = "va_session";
const SESSION_HOURS = 12;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string, mfaPending: boolean) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await db.adminSession.create({
    data: { tokenHash: hashToken(token), userId, mfaPending, expiresAt, ipAddress: clientIp(h), userAgent: h.get("user-agent")?.slice(0, 300) ?? null },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The current session and its user, or null. Pending (2FA not yet entered) sessions are included. */
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.adminSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return session;
}

export async function completeMfa(sessionId: string) {
  await db.adminSession.update({ where: { id: sessionId }, data: { mfaPending: false } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.adminSession.deleteMany({ where: { userId, NOT: token ? { tokenHash: hashToken(token) } : undefined } });
}
