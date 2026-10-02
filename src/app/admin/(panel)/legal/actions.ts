"use server";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";
import { sanitizePostHtml } from "@/lib/blog";
import { getSettings, saveSetting, type LegalSettings } from "@/lib/settings";

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);

export async function saveLegal(input: LegalSettings): Promise<{ ok: boolean; error?: string; legal?: LegalSettings }> {
  const me = await requireAdmin("admin");
  const { legal: old } = await getSettings();
  if (String(input.privacyHtml ?? "").length > 300_000 || String(input.termsHtml ?? "").length > 300_000) return { ok: false, error: "A document is too long to save." };
  const privacyHtml = sanitizePostHtml(String(input.privacyHtml ?? ""));
  const termsHtml = sanitizePostHtml(String(input.termsHtml ?? ""));
  if (!privacyHtml.replace(/<[^>]+>/g, "").trim() || !termsHtml.replace(/<[^>]+>/g, "").trim()) return { ok: false, error: "The Privacy Policy and Terms of Use can't be empty." };
  const privacyEmail = clean(input.privacyEmail, 200);
  if (privacyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyEmail)) return { ok: false, error: "Enter a valid privacy email address, or leave it empty to use the business email." };

  const next: LegalSettings = {
    privacyHtml,
    termsHtml,
    // The "last updated" date moves only when the words change.
    privacyUpdated: privacyHtml !== old.privacyHtml ? today() : old.privacyUpdated,
    termsUpdated: termsHtml !== old.termsHtml ? today() : old.termsUpdated,
    privacyEmail,
    privacyPhone: clean(input.privacyPhone, 30),
    mailingAddress: clean(input.mailingAddress, 200),
    governingState: clean(input.governingState, 40),
    honorGpc: !!input.honorGpc,
    responseDays: Math.min(90, Math.max(10, Math.round(Number(input.responseDays) || 45))),
    confirmByEmail: !!input.confirmByEmail,
    reviewed: privacyHtml !== old.privacyHtml || termsHtml !== old.termsHtml ? !!input.reviewed && input.reviewed !== old.reviewed : !!input.reviewed,
  };
  await saveSetting("legal", next);
  await audit(me.email, "legal_updated", "setting", "legal", {
    privacyChanged: next.privacyUpdated !== old.privacyUpdated,
    termsChanged: next.termsUpdated !== old.termsUpdated,
  });
  return { ok: true, legal: next };
}
