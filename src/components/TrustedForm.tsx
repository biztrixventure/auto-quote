"use client";
import Script from "next/script";

/**
 * TrustedForm consent certificate.
 * 1. Log in to the client's ActiveProspect account and copy the official
 *    TrustedForm web SDK snippet for this site.
 * 2. Put its script URL below (replace TRUSTEDFORM_SCRIPT_URL) and keep any
 *    parameters it requires.
 * 3. Set NEXT_PUBLIC_TRUSTEDFORM_ENABLED="true".
 * The script fills a hidden input named "xxTrustedFormCertUrl" inside the form,
 * which QuoteForm reads on submit and sends with the lead.
 * (Jornaya LeadiD works the same way with its own snippet and field name.)
 */
const TRUSTEDFORM_SCRIPT_URL = "";

export function TrustedForm() {
  if (process.env.NEXT_PUBLIC_TRUSTEDFORM_ENABLED !== "true" || !TRUSTEDFORM_SCRIPT_URL) return null;
  return <Script id="trustedform" src={TRUSTEDFORM_SCRIPT_URL} strategy="afterInteractive" />;
}
