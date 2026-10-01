// Security helpers that run in both middleware (edge) and the Node server, so they
// only use Web APIs (crypto.subtle, TextEncoder), never Node-only modules.

const encoder = new TextEncoder();

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** Compares two strings in constant time so response timing can't reveal how close a guess was. */
export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** True when ADMIN_USER / ADMIN_PASSWORD are set and the Basic auth header matches them. */
export async function isAdminAuthorized(authorization: string | null) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return false;
  const [scheme, encoded] = (authorization ?? "").split(" ");
  if (scheme !== "Basic" || !encoded) return false;
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const [userOk, passOk] = await Promise.all([safeEqual(decoded.slice(0, sep), user), safeEqual(decoded.slice(sep + 1), pass)]);
  return userOk && passOk;
}

/**
 * Best-effort client IP. Behind a proxy or host (Vercel, Cloudflare, nginx) make sure it
 * overwrites these headers, otherwise a client could send its own value.
 */
export function clientIp(headers: Headers) {
  return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** JSON for <script type="application/ld+json">, with "<" escaped so text can never close the tag. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
