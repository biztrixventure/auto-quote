import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Guards server-side requests to addresses typed into the admin (alert webhooks, lead buyers),
// so they can't be pointed at this server or a private network (SSRF).

function isPrivate(ip: string) {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivate(v6.slice(7));
    return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Throws unless the URL is https and every address it resolves to is on the public internet. */
export async function assertPublicHttpsUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Not a valid web address");
  }
  if (url.protocol !== "https:") throw new Error("Address must start with https://");
  if (url.username || url.password) throw new Error("Address must not contain a username or password");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private addresses aren't allowed");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (ips.length === 0 || ips.some(isPrivate)) throw new Error("Private addresses aren't allowed");
  return url;
}

/** POSTs JSON to a checked public https URL with a timeout. Redirects are not followed. */
export async function postJson(raw: string, body: unknown, headers: Record<string, string> = {}, timeoutMs = 10000) {
  const url = await assertPublicHttpsUrl(raw);
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
}
