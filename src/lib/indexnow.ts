import { audit } from "./audit";
import { getSettings, saveSetting } from "./settings";
import { site } from "./site";

// IndexNow (https://www.indexnow.org) tells Bing, Yandex, Seznam, Naver and other engines
// that a page was added, changed or removed, so they re-crawl it within minutes instead of
// days. Google doesn't use IndexNow; it finds changes through the sitemap.

export const INDEXNOW_KEY_PATH = "/indexnow.txt";

/** A new random key (IndexNow allows 8–128 letters, numbers and dashes). */
export function newIndexNowKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

const live = () => site.url.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(site.url);

/**
 * Sends site paths (e.g. "/blog/my-post") to IndexNow. Does nothing unless IndexNow is on and
 * the site runs on its real https domain. Never throws; the result is kept for the admin.
 */
export async function submitToIndexNow(paths: string[], by = "system") {
  const { indexnow } = await getSettings();
  if (!indexnow.enabled || !indexnow.key || !live() || paths.length === 0) return { ok: false, skipped: true, message: "IndexNow is off or the site isn't on its live domain yet." };

  const host = new URL(site.url).host;
  const urlList = [...new Set(paths.map((p) => (p.startsWith("http") ? p : `${site.url}${p}`)))].slice(0, 10000);
  let result: string;
  let ok = false;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: indexnow.key, keyLocation: `${site.url}${INDEXNOW_KEY_PATH}`, urlList }),
      signal: AbortSignal.timeout(10000),
    });
    ok = res.status === 200 || res.status === 202;
    result = ok
      ? `Sent ${urlList.length} page${urlList.length === 1 ? "" : "s"}`
      : res.status === 403
        ? "Rejected: the key file couldn't be checked yet. Try again in a few minutes."
        : res.status === 422
          ? "Rejected: some addresses don't match this site's domain."
          : res.status === 429
            ? "Too many submissions. Try again later."
            : `Rejected (HTTP ${res.status})`;
  } catch (e) {
    result = `Couldn't reach IndexNow: ${String(e).slice(0, 120)}`;
  }

  const { indexnow: latest } = await getSettings();
  await saveSetting("indexnow", { ...latest, lastSubmitted: new Date().toISOString(), lastResult: result });
  if (!ok) await audit(by, "indexnow_failed", "setting", "indexnow", { error: result });
  return { ok, skipped: false, message: result };
}
