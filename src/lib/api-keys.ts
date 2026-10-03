import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { canUseBlog } from "./auth";
import { db } from "./db";
import { rateLimit } from "./rate-limit";
import type { Saver } from "./post-save";

// Keys for the blog publishing API. A key is "vak_" + 43 random characters. Only its SHA-256
// hash is stored, so a database leak doesn't reveal working keys. Requests act as the admin
// user who created the key, limited to blog work, and only publish if the key allows it.

const PREFIX = "vak_";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a key and returns it. This is the only time the full key exists outside the request. */
export async function createApiKey(userId: string, name: string, canPublish: boolean) {
  const token = PREFIX + randomBytes(32).toString("base64url");
  const key = await db.apiKey.create({ data: { userId, name, canPublish, prefix: token.slice(0, 10), tokenHash: hash(token) }, select: { id: true } });
  return { id: key.id, token };
}

export type ApiCaller = { keyId: string; keyName: string; saver: Saver; canPublish: boolean; editor: boolean };

const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Checks "Authorization: Bearer vak_…". Returns the caller, or the error response to send.
 * 120 requests per minute per key.
 */
export async function authenticateApiKey(req: Request): Promise<ApiCaller | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(PREFIX) || token.length < 40 || token.length > 100) return fail(401, "Missing or invalid API key");

  const key = await db.apiKey.findUnique({
    where: { tokenHash: hash(token) },
    select: { id: true, name: true, canPublish: true, revokedAt: true, lastUsedAt: true, user: { select: { id: true, email: true, role: true, active: true } } },
  });
  if (!key || key.revokedAt || !key.user.active || !canUseBlog(key.user)) return fail(401, "Missing or invalid API key");

  const limit = rateLimit(`apikey:${key.id}`, 120, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  // Record use at most every 5 minutes.
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 5 * 60_000) {
    await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  }
  const editor = key.user.role === "admin" || key.user.role === "owner";
  return {
    keyId: key.id,
    keyName: key.name,
    canPublish: key.canPublish,
    editor,
    saver: { id: key.user.id, role: key.user.role, email: key.user.email, actor: `api:${key.name}`, publishAllowed: key.canPublish },
  };
}
