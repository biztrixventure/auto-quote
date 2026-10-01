// Fixed-window rate limiter kept in memory. Works for a single server; when running
// several instances (or serverless), back it with Redis/Upstash or use your host's WAF.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

/** Counts one hit for `key`. Returns whether it is allowed and seconds until the window resets. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

/** Reads a counter without adding to it (used to check lockouts before verifying a password). */
export function peekLimit(key: string, limit: number) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= Date.now()) return { blocked: false, retryAfter: 0 };
  return { blocked: b.count >= limit, retryAfter: Math.ceil((b.resetAt - Date.now()) / 1000) };
}

export function resetLimit(key: string) {
  buckets.delete(key);
}
