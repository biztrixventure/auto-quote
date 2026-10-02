"use server";

import { requireAdmin } from "@/lib/admin-guard";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getSettings, saveSetting } from "@/lib/settings";
import { assertPublicHttpsUrl } from "@/lib/outbound";
import { sendTestAlert } from "@/lib/notify";
import { newIndexNowKey, submitToIndexNow } from "@/lib/indexnow";
import sitemap from "@/app/sitemap";

const back = (q: Record<string, string>) => redirect(`/admin/settings?${new URLSearchParams(q)}`);
const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// Accepts the bare code or the whole <meta ... content="..."> tag the provider gives you.
const token = (raw: string) => raw.match(/content=["']([^"']+)["']/i)?.[1]?.trim() ?? raw;

function check(value: string, re: RegExp, message: string) {
  if (value && !re.test(value)) throw new Error(message);
  return value;
}

export async function saveTracking(f: FormData) {
  const me = await requireAdmin("admin");
  try {
    const value = {
      ga4Id: check(val(f, "ga4Id").toUpperCase(), /^G-[A-Z0-9]{4,15}$/, "Google Analytics ID should look like G-XXXXXXXXXX."),
      gtmId: check(val(f, "gtmId").toUpperCase(), /^GTM-[A-Z0-9]{4,12}$/, "Tag Manager ID should look like GTM-XXXXXXX."),
      metaPixelId: check(val(f, "metaPixelId"), /^\d{8,20}$/, "Meta Pixel ID should be numbers only, e.g. 123456789012345."),
    };
    await saveSetting("tracking", value);
    await audit(me.email, "settings_updated", "setting", "tracking", value);
  } catch (e) {
    back({ error: (e as Error).message });
  }
  back({ saved: "Analytics and tracking saved. Changes are live on the website." });
}

export async function saveVerification(f: FormData) {
  const me = await requireAdmin("admin");
  try {
    const re = /^[A-Za-z0-9_\-.=]{8,120}$/;
    const value = {
      google: check(token(val(f, "google")), re, "That Google verification code doesn't look right. Paste the code or the whole meta tag."),
      bing: check(token(val(f, "bing")), re, "That Bing verification code doesn't look right. Paste the code or the whole meta tag."),
      yandex: check(token(val(f, "yandex")), re, "That Yandex verification code doesn't look right. Paste the code or the whole meta tag."),
      meta: check(token(val(f, "meta")), re, "That Meta verification code doesn't look right. Paste the code or the whole meta tag."),
    };
    await saveSetting("verification", value);
    await audit(me.email, "settings_updated", "setting", "verification", { google: !!value.google, bing: !!value.bing, yandex: !!value.yandex, meta: !!value.meta });
  } catch (e) {
    back({ error: (e as Error).message });
  }
  back({ saved: "Verification codes saved. You can now click Verify in each tool." });
}

/** Turns IndexNow on or off. A key is created the first time it's turned on. */
export async function saveIndexNow(f: FormData) {
  const me = await requireAdmin("admin");
  const { indexnow } = await getSettings();
  const enabled = f.get("enabled") === "on";
  await saveSetting("indexnow", { ...indexnow, enabled, key: indexnow.key || newIndexNowKey() });
  await audit(me.email, "settings_updated", "setting", "indexnow", { enabled });
  back({ saved: enabled ? "IndexNow is on. New and updated pages are sent to Bing and Yandex automatically." : "IndexNow is off." });
}

/** Sends every page in the sitemap to IndexNow (use after launch or a big update). */
export async function submitAllToIndexNow() {
  const me = await requireAdmin("admin");
  const urls = (await sitemap()).map((e) => e.url);
  const r = await submitToIndexNow(urls, me.email);
  await audit(me.email, "indexnow_submitted", "setting", "indexnow", { pages: urls.length, result: r.message });
  back(r.ok ? { saved: `${r.message} to Bing, Yandex and other IndexNow search engines.` } : { error: r.message });
}

export async function saveSeo(f: FormData) {
  const me = await requireAdmin("admin");
  const value = { title: val(f, "title"), description: val(f, "description") };
  if (value.title.length > 70) back({ error: "Keep the title to 70 characters or fewer so Google doesn't cut it off." });
  if (value.description.length > 170) back({ error: "Keep the description to 170 characters or fewer so Google doesn't cut it off." });
  await saveSetting("seo", value);
  await audit(me.email, "settings_updated", "setting", "seo", value);
  back({ saved: "SEO settings saved." });
}

export async function saveResults(f: FormData) {
  const me = await requireAdmin("admin");
  const value = { disclaimer: val(f, "disclaimer") };
  if (value.disclaimer.length > 600) back({ error: "Keep the disclaimer to 600 characters or fewer." });
  await saveSetting("results", value);
  await audit(me.email, "settings_updated", "setting", "results", value);
  back({ saved: "Results page text saved." });
}

export async function saveBusiness(f: FormData) {
  const me = await requireAdmin("admin");
  const phone = val(f, "phone");
  const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) back({ error: "Enter a valid US phone number, e.g. (800) 555-0142." });
  const email = val(f, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back({ error: "Enter a valid email address." });
  const consentText = String(f.get("consentText") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 2000);
  if (consentText.length < 40) back({ error: "The consent text looks too short. Paste the full wording from your lawyer." });

  const { business: current } = await getSettings();
  let consentVersion = current.consentVersion;
  // Any change to the consent wording gets a new version, so each lead records exactly what it agreed to.
  if (consentText !== current.consentText) {
    const today = new Date().toISOString().slice(0, 10);
    const n = current.consentVersion.startsWith(today) ? Number(current.consentVersion.split("-v")[1] ?? 1) + 1 : 1;
    consentVersion = `${today}-v${n}`;
  }
  const value = {
    phone: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
    email,
    agencyLegalName: val(f, "agencyLegalName").slice(0, 120) || current.agencyLegalName,
    licenseNote: val(f, "licenseNote").slice(0, 400),
    consentText,
    consentVersion,
  };
  await saveSetting("business", value);
  await audit(me.email, "settings_updated", "setting", "business", { ...value, consentText: consentText === current.consentText ? "(unchanged)" : "(changed)" });
  back({ saved: consentVersion !== current.consentVersion ? `Business details saved. Consent text is now version ${consentVersion}.` : "Business details saved." });
}

export async function saveNotifications(f: FormData) {
  const me = await requireAdmin("admin");
  const emails = val(f, "emailTo").split(",").map((s) => s.trim()).filter(Boolean);
  if (emails.length > 10 || emails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) back({ error: "Alert emails: enter up to 10 valid addresses, separated by commas." });
  const phones = val(f, "smsTo").split(",").map((s) => s.trim()).filter(Boolean);
  if (phones.length > 5 || phones.some((p) => !/^\+[1-9]\d{7,14}$/.test(p))) back({ error: "Alert phone numbers must be in international format, e.g. +15125550100 (up to 5)." });
  const webhookUrl = val(f, "webhookUrl");
  if (webhookUrl) {
    try {
      await assertPublicHttpsUrl(webhookUrl);
    } catch (e) {
      back({ error: `Chat webhook: ${(e as Error).message}.` });
    }
  }
  const value = { emailTo: emails.join(", "), smsTo: phones.join(", "), webhookUrl, onNewLead: f.get("onNewLead") === "on", onNoQuotes: f.get("onNoQuotes") === "on" };
  await saveSetting("notifications", value);
  await audit(me.email, "settings_updated", "setting", "notifications", { ...value, webhookUrl: webhookUrl ? "(set)" : "" });
  back({ saved: "Alert settings saved." });
}

export async function testAlerts() {
  const me = await requireAdmin("admin");
  const report = await sendTestAlert(me.name);
  const parts = Object.entries(report).map(([ch, r]) => `${ch}: ${r}`);
  if (parts.length === 0) back({ error: "No alert channels are set up yet. Add recipients or a webhook first." });
  const failed = Object.values(report).some((r) => r !== "sent");
  back(failed ? { error: `Test alert — ${parts.join(" · ")}` } : { saved: `Test alert sent — ${parts.join(" · ")}` });
}
