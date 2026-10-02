import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";
import { DEFAULT_PRIVACY_HTML, DEFAULT_TERMS_HTML } from "./legal-templates";
import { site } from "./site";

export type TrackingSettings = { ga4Id: string; gtmId: string; metaPixelId: string };
export type VerificationSettings = { google: string; bing: string; yandex: string; meta: string };
/** IndexNow tells Bing, Yandex and other engines about new or changed pages right away. */
export type IndexNowSettings = { enabled: boolean; key: string; lastSubmitted: string; lastResult: string };
/** Google Search Console API connection; the service-account key itself lives in the server environment. */
export type SearchConsoleSettings = { property: string; lastSubmitted: string; lastResult: string };
export type SeoSettings = { title: string; description: string };
export type ResultsSettings = { disclaimer: string };

export type BusinessSettings = {
  phone: string;
  email: string;
  agencyLegalName: string;
  licenseNote: string;
  consentText: string;
  consentVersion: string; // changes automatically whenever consentText changes
};

export type ReviewItem = { name: string; location: string; date: string; rating: number; text: string; title?: string };
export type ReviewTheme = "trustpilot" | "google";
export type ContentSettings = {
  hero: { eyebrow: string; title: string; subtitle: string };
  whyIntro: string;
  reasons: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  repairCosts: Record<string, string>; // part name -> price shown in the car diagram
  reviews: {
    theme?: ReviewTheme; // look of the reviews section; defaults to Trustpilot
    autoplaySeconds?: number; // seconds between slides; 0 = don't move
    summary: { platform: string; rating: number; count: number; url: string } | null;
    items: ReviewItem[];
    award: { text: string; url: string } | null;
  };
};

/** One menu entry. Header items may have one level of children (a dropdown). */
export type MenuItem = { id: string; label: string; href: string; newTab?: boolean; description?: string; children?: MenuItem[] };
/** @deprecated kept for older saved settings */
export type NavLink = MenuItem;
export type FooterColumn = { id: string; title: string; links: MenuItem[] };
export type NavigationSettings = {
  links: MenuItem[]; // header menu, left to right
  showPhone: boolean;
  ctaLabel: string; // yellow button; empty = hidden
  ctaHref: string;
  sticky: boolean; // header stays at the top while scrolling
  announcement: { enabled: boolean; text: string; linkLabel: string; href: string };
  footerColumns: FooterColumn[];
};

export type LegalSettings = {
  privacyHtml: string;
  termsHtml: string;
  privacyUpdated: string; // YYYY-MM-DD, set automatically when the text changes
  termsUpdated: string;
  privacyEmail: string; // empty = business email
  privacyPhone: string; // empty = business phone
  mailingAddress: string;
  governingState: string;
  honorGpc: boolean; // treat the browser's Global Privacy Control signal as an opt-out
  responseDays: number; // deadline for access/delete/correct requests
  confirmByEmail: boolean; // email people a confirmation of their request (needs email alerts set up)
  reviewed: boolean; // an attorney has approved both documents
};

export type BlogSettings = {
  title: string;
  intro: string;
  postsPerPage: number;
  writersCanPublish: boolean; // false = writers send posts to an admin for review
  showQuoteCta: boolean; // quote box inside every post
  ctaTitle: string;
  ctaText: string;
};

export type NotificationSettings = {
  emailTo: string; // comma-separated
  smsTo: string; // comma-separated, E.164 e.g. +15125550100
  webhookUrl: string; // Slack, Teams, Google Chat or any https webhook
  onNewLead: boolean;
  onNoQuotes: boolean; // extra alert when a lead got no online quotes and needs a call
};

export type PricingRules = {
  basePrice: number; // monthly, in dollars, before adjustments
  coveragePercent: { state_minimum: number; standard: number; premium: number }; // e.g. -38 = 38% cheaper
  ageUnder25: number; // added to the monthly price, in dollars
  age65Plus: number;
  perAccident: number;
  perViolation: number;
  uninsuredPercent: number; // surcharge when the driver has no current insurance
  newVehiclePercent: number; // surcharge for vehicles 3 years old or newer
  termMonths: number;
  maxQuotes: number;
  declineSuspended: boolean;
  declineAtIncidents: number; // accidents + violations at or above this get no online quotes; 0 = never
  coverageSummary: { state_minimum: string; standard: string; premium: string };
};

// Defaults match the original built-in demo formula.
export const DEFAULTS = {
  tracking: { ga4Id: "", gtmId: "", metaPixelId: "" } as TrackingSettings,
  verification: { google: "", bing: "", yandex: "", meta: "" } as VerificationSettings,
  indexnow: { enabled: false, key: "", lastSubmitted: "", lastResult: "" } as IndexNowSettings,
  searchConsole: { property: "", lastSubmitted: "", lastResult: "" } as SearchConsoleSettings,
  seo: { title: "", description: "" } as SeoSettings,
  results: {
    disclaimer:
      "Prices shown are estimates based on the information you provided. Your final price is set by the insurance company after it reviews your driving record and other details.",
  } as ResultsSettings,
  business: {
    phone: site.phone,
    email: site.email,
    agencyLegalName: site.agencyLegalName,
    licenseNote: site.licenseNote,
    consentText: site.consentText,
    consentVersion: site.consentVersion,
  } as BusinessSettings,
  notifications: { emailTo: "", smsTo: "", webhookUrl: "", onNewLead: true, onNoQuotes: true } as NotificationSettings,
  navigation: {
    links: [
      { id: "repair-costs", label: "Repair costs", href: "/repair-costs" },
      { id: "why-us", label: "Why us", href: "/why-us" },
      { id: "faq", label: "FAQ", href: "/faq" },
      { id: "blog", label: "Blog", href: "/blog" },
    ],
    showPhone: true,
    ctaLabel: "Get a quote",
    ctaHref: "/quote/auto",
    sticky: true,
    announcement: { enabled: false, text: "", linkLabel: "", href: "" },
    footerColumns: [
      {
        id: "get-covered",
        title: "Get covered",
        links: [
          { id: "f-quote", label: "Get a free quote", href: "/quote/auto" },
          { id: "f-repair", label: "Repair costs", href: "/repair-costs" },
          { id: "f-why", label: "Why choose us", href: "/why-us" },
          { id: "f-faq", label: "FAQ", href: "/faq" },
          { id: "f-blog", label: "Blog", href: "/blog" },
        ],
      },
      {
        id: "policies",
        title: "Policies",
        links: [
          { id: "f-privacy", label: "Privacy Policy", href: "/privacy" },
          { id: "f-terms", label: "Terms of Use", href: "/terms" },
          { id: "f-dns", label: "Do Not Sell or Share My Personal Information", href: "/do-not-sell" },
        ],
      },
    ],
  } as NavigationSettings,
  legal: {
    privacyHtml: DEFAULT_PRIVACY_HTML,
    termsHtml: DEFAULT_TERMS_HTML,
    privacyUpdated: "2026-10-02",
    termsUpdated: "2026-10-02",
    privacyEmail: "",
    privacyPhone: "",
    mailingAddress: "",
    governingState: "",
    honorGpc: true,
    responseDays: 45,
    confirmByEmail: true,
    reviewed: false,
  } as LegalSettings,
  blog: {
    title: "The {company} Blog",
    intro: "Practical guides on car insurance, extended warranties and keeping repair costs down.",
    postsPerPage: 9,
    writersCanPublish: false,
    showQuoteCta: true,
    ctaTitle: "See how much you could save",
    ctaText: "Compare car insurance quotes from several companies in about 3 minutes. Free, no obligation.",
  } as BlogSettings,
  content: {
    hero: {
      eyebrow: "Auto insurance, made easier",
      title: "Find coverage that keeps you moving.",
      subtitle: "Compare car insurance prices from several companies with one quick form. Get help from a licensed agent whenever you need it.",
    },
    whyIntro:
      "Our goal is simple: take the stress out of car repairs and surprise maintenance. Repair bills can be expensive and often arrive at the worst possible time. At {company}, we're committed to service you can count on, protecting your budget from unexpected repair costs and giving you the confidence that help is always just a phone call away.",
    reasons: [
      { title: "Unexpected Repairs", body: "When your car breaks down without warning, {company} has your back. We handle covered repairs quickly and efficiently so you can get back on the road." },
      { title: "Any ASE-Certified Repair Shop", body: "You're never tied to one location. Take your vehicle to any ASE-certified technician, anywhere in the country." },
      { title: "Flexible Plans", body: "Choose from several customizable plans. We'll help you find coverage that fits your vehicle and your budget. Call us for a free quote." },
      { title: "30-Day Money-Back Guarantee", body: "Your satisfaction comes first. If you're not happy with your plan for any reason within 30 days, {company} will refund you in full." },
    ],
    faqs: [
      { q: "What is an extended auto warranty?", a: "An extended auto warranty is a vehicle service contract that pays for unexpected repairs and replacement parts, such as the engine, transmission and brake system, after your factory warranty runs out." },
      { q: "Can I buy an extended warranty after I've bought my car?", a: "Yes. You can purchase an extended warranty at any time, not just when you buy the vehicle." },
      { q: "What does an extended auto warranty cover?", a: "Our basic plan covers the engine, transmission, cooling system, brake system, electrical system and drive axle, plus trip interruption and roadside assistance. {company} offers several coverage levels, so you can choose the plan that fits your vehicle." },
      { q: "Is a car warranty the same as car insurance?", a: "No. Car insurance typically protects you after an accident, while a car warranty helps pay for repairs and replacement parts when something breaks down or fails." },
      { q: "Can you buy a warranty for an older car?", a: "Yes. Your vehicle's age doesn't matter, as long as it's in good working condition when you buy the plan." },
    ],
    repairCosts: {
      "Engine Cylinder Head": "$7,500",
      Alternator: "$628-$814",
      "Instrument Cluster": "$885-$905",
      "A/C Compressor": "$550",
      "Backup Camera": "$631-$647",
      Transmission: "$3,000",
      "Power Steering Pump": "$500-$800",
      "Suspension Struts": "$1,254",
    },
    reviews: { summary: site.customerReviews.summary, items: site.customerReviews.reviews, award: site.customerReviews.award },
  } as ContentSettings,
  pricing: {
    basePrice: 95,
    coveragePercent: { state_minimum: -38, standard: 0, premium: 35 },
    ageUnder25: 70,
    age65Plus: 15,
    perAccident: 38,
    perViolation: 22,
    uninsuredPercent: 18,
    newVehiclePercent: 12,
    termMonths: 6,
    maxQuotes: 4,
    declineSuspended: true,
    declineAtIncidents: 4,
    coverageSummary: {
      state_minimum: "State minimum liability",
      standard: "50/100/50 liability, $1,000 deductible collision & comprehensive",
      premium: "100/300/100 liability, $500 deductible collision & comprehensive",
    },
  } as PricingRules,
};

export type SettingKey = keyof typeof DEFAULTS;
export type Settings = { [K in SettingKey]: (typeof DEFAULTS)[K] };

// Only the raw rows are cached (saving any setting clears it); defaults are merged on every call,
// so a cache entry written before a new setting or field existed can't hide its default.
const loadRows = unstable_cache(
  async () => db.setting.findMany({ select: { key: true, value: true } }),
  ["settings-rows"],
  { tags: ["settings"] },
);

export async function getSettings(): Promise<Settings> {
  const out = structuredClone(DEFAULTS) as Settings;
  for (const row of await loadRows()) {
    if (!(row.key in DEFAULTS)) continue;
    try {
      const key = row.key as SettingKey;
      // Merge so settings saved before a new field was added still get its default.
      Object.assign(out[key], JSON.parse(row.value));
    } catch {}
  }
  out.navigation = normalizeNavigation(out.navigation);
  return out;
}

// Section links from before the site had separate pages now point at those pages.
const OLD_ANCHORS: Record<string, string> = { "/#repair-costs": "/repair-costs", "/#why-choose": "/why-us", "/#faq": "/faq", "/privacy#do-not-sell": "/do-not-sell" };

/** Fills in ids and missing fields for menus saved by older versions. */
function normalizeNavigation(nav: NavigationSettings): NavigationSettings {
  let n = 0;
  const item = (raw: Partial<MenuItem>, depth: number): MenuItem => ({
    id: raw.id || `m${++n}`,
    label: String(raw.label ?? ""),
    href: OLD_ANCHORS[String(raw.href)] ?? String(raw.href ?? "/"),
    ...(raw.newTab ? { newTab: true } : {}),
    ...(raw.description ? { description: String(raw.description) } : {}),
    ...(depth === 0 && raw.children?.length ? { children: raw.children.map((c) => item(c, 1)) } : {}),
  });
  return {
    ...nav,
    links: (nav.links ?? []).map((l) => item(l, 0)),
    sticky: nav.sticky ?? true,
    announcement: { ...DEFAULTS.navigation.announcement, ...(nav.announcement ?? {}) },
    footerColumns: (nav.footerColumns ?? DEFAULTS.navigation.footerColumns).map((c, i) => ({
      id: c.id || `c${i}`,
      title: String(c.title ?? ""),
      links: (c.links ?? []).map((l) => item(l, 1)),
    })),
  };
}

export async function saveSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  const json = JSON.stringify(value);
  await db.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
  revalidateTag("settings");
}

/** Replaces {company} in editable text with the business name. */
export const fillCompany = (text: string) => text.replaceAll("{company}", site.name);

/** Business details for the public site: site.ts defaults overlaid with /admin/content edits. */
export async function getSite() {
  const { business } = await getSettings();
  return { ...site, ...business, phoneHref: `tel:+1${business.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")}` };
}
