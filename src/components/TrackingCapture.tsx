"use client";
import { useEffect } from "react";

const KEY = "aq_tracking";
const PARAMS: Record<string, string> = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_term: "utmTerm",
  utm_content: "utmContent",
  gclid: "gclid",
  fbclid: "fbclid",
};

/** Saves ad/UTM parameters from the first landing page so they travel with the lead. */
export function TrackingCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const found: Record<string, string> = {};
      for (const [param, field] of Object.entries(PARAMS)) {
        const v = url.searchParams.get(param);
        if (v) found[field] = v.slice(0, 200);
      }
      const existing = readTracking();
      if (Object.keys(found).length > 0 || !existing.landingPage) {
        const next = {
          ...existing,
          ...found,
          landingPage: existing.landingPage ?? url.pathname + url.search,
          referrer: existing.referrer ?? (document.referrer || undefined),
        };
        localStorage.setItem(KEY, JSON.stringify(next));
      }
    } catch {
      /* storage unavailable: tracking is best effort */
    }
  }, []);
  return null;
}

export function readTracking(): Record<string, string | undefined> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
