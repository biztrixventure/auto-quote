import { cookies, headers } from "next/headers";
import { getSettings, getSite } from "./settings";

/** Set for a year when someone opts out of sale/sharing on /do-not-sell. */
export const OPT_OUT_COOKIE = "va_optout";

export const REQUEST_TYPES = {
  opt_out_sale: { label: "Do not sell or share my personal information", short: "Opt out of sale/sharing", instant: true },
  opt_out_contact: { label: "Stop calls, texts and emails", short: "Stop contacting me", instant: true },
  access: { label: "Send me a copy of my information", short: "Access my data", instant: false },
  delete: { label: "Delete my information", short: "Delete my data", instant: false },
  correct: { label: "Correct my information", short: "Correct my data", instant: false },
} as const;
export type RequestType = keyof typeof REQUEST_TYPES;

export const REQUEST_STATUS: Record<string, { label: string; style: string }> = {
  new: { label: "New", style: "bg-sky/10 text-sky" },
  in_progress: { label: "In progress", style: "bg-amber-50 text-amber-800" },
  completed: { label: "Completed", style: "bg-emerald-50 text-emerald-700" },
  denied: { label: "Closed, not verified", style: "bg-[#F2F4F7] text-road" },
};

/** Legal settings with business details filled in where the privacy ones are blank. */
export async function getLegal() {
  const [{ legal }, biz] = await Promise.all([getSettings(), getSite()]);
  const vars: Record<string, string> = {
    company: biz.name,
    legal_name: biz.agencyLegalName || biz.name,
    email: biz.email,
    phone: biz.phone,
    privacy_email: legal.privacyEmail || biz.email,
    privacy_phone: legal.privacyPhone || biz.phone,
    address: legal.mailingAddress || "[Mailing address]",
    governing_state: legal.governingState || "[State]",
    site_url: biz.url.replace(/^https?:\/\//, ""),
    response_days: String(legal.responseDays),
  };
  return { legal, vars };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Replaces {tokens} in a stored (already cleaned) legal document; values are escaped. */
export function fillLegal(html: string, vars: Record<string, string>) {
  return html.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in vars ? escapeHtml(vars[k]) : m));
}

/** "October 2, 2026" from YYYY-MM-DD. */
export const legalDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/**
 * Whether this visitor has opted out of sale/sharing: by our opt-out cookie, or by a Global
 * Privacy Control signal from their browser (when honoring it is on, which the law expects).
 */
export async function visitorOptedOut(honorGpc: boolean) {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return c.get(OPT_OUT_COOKIE)?.value === "1" || (honorGpc && h.get("sec-gpc") === "1");
}
