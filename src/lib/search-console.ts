import { createSign } from "node:crypto";
import { audit } from "./audit";
import { getSettings, saveSetting } from "./settings";
import { site } from "./site";

// Google Search Console API (official): resubmits the sitemap so Google re-reads it and finds
// new or changed pages, and reads back when Google last fetched it. Google offers no API to
// force-index ordinary pages; "Request indexing" exists only by hand inside Search Console.
//
// Setup: a Google Cloud service account with the Search Console API enabled, added as an
// Owner of the property in Search Console. Its JSON key goes in GOOGLE_SERVICE_ACCOUNT_JSON
// (raw JSON or base64) in the server environment, never in the database.

type Account = { client_email: string; private_key: string };

function account(): Account | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const j = JSON.parse(text) as Partial<Account>;
    if (j.client_email && j.private_key) return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n") };
  } catch {}
  return null;
}

export const googleConnected = () => account() !== null;
export const serviceAccountEmail = () => account()?.client_email ?? null;
/** "https://example.com/" (URL-prefix property) or "sc-domain:example.com" (domain property). */
export const validProperty = (p: string) => /^sc-domain:[a-z0-9.-]+\.[a-z]{2,}$/i.test(p) || /^https?:\/\/[^\s/]+\/$/i.test(p);

let cached: { token: string; exp: number } | null = null;

/** Signs a short-lived token request with the service-account key (exported for testing). */
export async function accessToken(a: Account) {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({ iss: a.client_email, scope: "https://www.googleapis.com/auth/webmasters", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(a.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !j.access_token) throw new Error(j.error_description || j.error || `Google sign-in failed (HTTP ${res.status})`);
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cached.token;
}

const sitemapUrl = () => `${site.url}/sitemap.xml`;
const endpoint = (property: string) => `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(sitemapUrl())}`;
const live = () => site.url.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(site.url);

/**
 * Resubmits the sitemap to Google. With `minIntervalMs`, skips if it was sent recently
 * (used after each publish so a busy editing day doesn't spam Google). Never throws.
 */
export async function submitSitemapToGoogle(by = "system", opts: { minIntervalMs?: number } = {}) {
  const { searchConsole: sc } = await getSettings();
  const a = account();
  if (!a || !sc.property) return { ok: false, skipped: true, message: "Google isn't connected yet." };
  if (!live()) return { ok: false, skipped: true, message: "The site isn't on its live https:// address yet." };
  if (opts.minIntervalMs && sc.lastSubmitted && Date.now() - Date.parse(sc.lastSubmitted) < opts.minIntervalMs) {
    return { ok: true, skipped: true, message: "Sent recently; Google already knows." };
  }

  let ok = false;
  let message: string;
  try {
    const token = await accessToken(a);
    const res = await fetch(endpoint(sc.property), { method: "PUT", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    ok = res.ok;
    message = ok
      ? "Sitemap submitted to Google"
      : res.status === 403
        ? `Google refused: add ${a.client_email} as an Owner in Search Console → Settings → Users and permissions.`
        : res.status === 404
          ? "Google couldn't find that Search Console property. Check the property name."
          : `Google returned HTTP ${res.status}.`;
  } catch (e) {
    message = `Couldn't reach Google: ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}`;
  }
  const { searchConsole: latest } = await getSettings();
  await saveSetting("searchConsole", { ...latest, lastSubmitted: new Date().toISOString(), lastResult: message });
  if (!ok) await audit(by, "google_submit_failed", "setting", "searchConsole", { error: message });
  return { ok, skipped: false, message };
}

export type SitemapStatus = { lastDownloaded: string | null; isPending: boolean; errors: number; warnings: number; submitted: number };

/** What Google reports about the sitemap (when it last read it, errors, pages listed). */
export async function googleSitemapStatus(): Promise<SitemapStatus | null> {
  const { searchConsole: sc } = await getSettings();
  const a = account();
  if (!a || !sc.property || !live()) return null;
  try {
    const token = await accessToken(a);
    const res = await fetch(endpoint(sc.property), { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { lastDownloaded?: string; isPending?: boolean; errors?: string; warnings?: string; contents?: { submitted?: string }[] };
    return {
      lastDownloaded: j.lastDownloaded ?? null,
      isPending: !!j.isPending,
      errors: Number(j.errors ?? 0),
      warnings: Number(j.warnings ?? 0),
      submitted: (j.contents ?? []).reduce((n, c) => n + Number(c.submitted ?? 0), 0),
    };
  } catch {
    return null;
  }
}
