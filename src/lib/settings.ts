import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";
import { DEFAULT_PRIVACY_HTML, DEFAULT_TERMS_HTML } from "./legal-templates";
import { site } from "./site";

export type TrackingSettings = { ga4Id: string; gtmId: string; metaPixelId: string };
export type VerificationSettings = { google: string; bing: string; yandex: string; meta: string };
/** IndexNow tells Bing, Yandex and other engines about new or changed pages right away. */
export type IndexNowSettings = { enabled: boolean; key: string; lastSubmitted: string; lastResult: string };
/** AI search: which AI crawlers may read the site, and the /llms.txt summary. */
export type AiSettings = { allowSearchBots: boolean; allowTrainingBots: boolean; llmsTxt: boolean };
export type SeoSettings = { title: string; description: string };
export type ResultsSettings = { disclaimer: string };

export type BusinessSettings = {
  phone: string;
  email: string;
  agencyLegalName: string;
  licenseNote: string;
  consentText: string;
  consentVersion: string; // changes automatically whenever consentText changes
  vscConsentText: string; // consent on the vehicle service contract form
  vscConsentVersion: string;
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
  ai: { allowSearchBots: true, allowTrainingBots: true, llmsTxt: true } as AiSettings,
  seo: { title: "", description: "" } as SeoSettings,
  results: {
    disclaimer:
      "Prices shown are estimates based on your car's year, make and mileage. Your exact price depends on the plan, term and deductible you choose, and we confirm it before you buy.",
  } as ResultsSettings,
  business: {
    phone: site.phone,
    email: site.email,
    agencyLegalName: site.agencyLegalName,
    licenseNote: site.licenseNote,
    consentText: site.consentText,
    consentVersion: site.consentVersion,
    vscConsentText: site.vscConsentText,
    vscConsentVersion: site.vscConsentVersion,
  } as BusinessSettings,
  notifications: { emailTo: "", smsTo: "", webhookUrl: "", onNewLead: true, onNoQuotes: true } as NotificationSettings,
  navigation: {
    links: [
      { id: "repair-costs", label: "Repair costs", href: "/repair-costs" },
      { id: "why-us", label: "Why us", href: "/why-us" },
      { id: "faq", label: "FAQ", href: "/faq" },
      { id: "blog", label: "Blog", href: "/blog" },
      { id: "about", label: "About", href: "/about" },
    ],
    showPhone: true,
    ctaLabel: "Get a quote",
    ctaHref: "/quote/vehicle-protection",
    sticky: true,
    announcement: { enabled: false, text: "", linkLabel: "", href: "" },
    footerColumns: [
      {
        id: "get-covered",
        title: "Get a quote",
        links: [
          { id: "f-vsc", label: "Extended warranty quote", href: "/quote/vehicle-protection" },
          { id: "f-repair", label: "Repair costs", href: "/repair-costs" },
          { id: "f-why", label: "Why choose us", href: "/why-us" },
          { id: "f-faq", label: "FAQ", href: "/faq" },
          { id: "f-blog", label: "Blog", href: "/blog" },
          { id: "f-about", label: "About us", href: "/about" },
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
    intro: "Practical guides on extended car warranties, vehicle service contracts and keeping repair costs down.",
    postsPerPage: 9,
    writersCanPublish: false,
    showQuoteCta: true,
    ctaTitle: "Worried about your next repair bill?",
    ctaText: "See estimated extended car warranty prices for your car in a few minutes. Free, no obligation.",
  } as BlogSettings,
  content: {
    hero: {
      eyebrow: "Extended car warranty plans",
      title: "Protect your budget from costly car repairs.",
      subtitle: "A vehicle service contract helps pay for engine, transmission and other major repairs after your factory warranty ends. See plan prices for your car in a few minutes.",
    },
    whyIntro:
      "Our goal is simple: take the stress out of car repairs. Repair bills can be expensive and often arrive at the worst possible time. A {company} vehicle service contract helps protect your budget, and real people are always a phone call away.",
    reasons: [
      { title: "Real People, Plain Answers", body: "Our team talks you through your options and answers your questions before you decide anything." },
      { title: "Backed by Trusted Providers", body: "Every plan is backed and administered by an established vehicle service contract provider, so claims are handled by people who do this every day." },
      { title: "Options That Fit You", body: "Choose from powertrain to complete plans, with terms and deductibles that fit your car and your budget." },
      { title: "Free, No Obligation", body: "Quotes are free, you can review the full contract before you buy, and every plan comes with a 30-day money-back guarantee." },
    ],
    faqs: [
      { q: "What is a vehicle service contract?", a: "A vehicle service contract, often called an extended car warranty, is an optional contract that pays for repairs and replacement parts it lists, such as the engine, transmission and brake system, after your factory warranty runs out. It isn't insurance." },
      { q: "Can I buy a vehicle service contract after I've bought my car?", a: "Yes. You can buy one at any time, not just when you buy the vehicle." },
      { q: "What does a vehicle service contract include?", a: "It depends on the plan. Basic plans usually include the engine, transmission and drivetrain, and higher levels add systems such as cooling, brakes, electrical and air conditioning; some also include roadside assistance and trip interruption. The exact parts, exclusions and deductible are listed in each contract." },
      { q: "Is a vehicle service contract the same as car insurance?", a: "No. Car insurance pays for damage and injuries after an accident, and most states require it. A vehicle service contract is optional and pays for repairs when a listed part breaks down. It doesn't replace the insurance your state requires." },
      { q: "Can I get a vehicle service contract for an older car?", a: "Often, yes. Many plans accept older and higher-mileage cars, as long as the car is in good working condition when you buy the plan. Eligibility depends on the plan." },
      { q: "How much does an extended car warranty cost?", a: "Most plans cost about $600 to $1,500 a year, depending on the age, mileage and make of your car and the plan level, and many people pay monthly. Our free quote shows estimated prices for your car in a few minutes." },
      { q: "Can I cancel my plan and get a refund?", a: "Yes. Every plan {company} sells comes with a 30-day money-back guarantee: cancel within 30 days of purchase for a full refund, as long as no claims have been filed. After that, you can usually cancel for a prorated refund under the terms of your contract." },
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
    // Roughly US market level (2026): full coverage averages about $2,000 a year, state minimum about $750.
    basePrice: 165,
    coveragePercent: { state_minimum: -62, standard: 0, premium: 28 },
    ageUnder25: 120,
    age65Plus: 20,
    perAccident: 60,
    perViolation: 35,
    uninsuredPercent: 20,
    newVehiclePercent: 15,
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

// Earlier default wording mixed car insurance and service contract language. Saved text that still
// matches an old default word for word gets the new default; anything an admin wrote is kept.
const OLD_DEFAULT_TEXT = new Map<string, string>([
  ["Auto insurance, made easier", "Extended car warranty plans"],
  ["Find coverage that keeps you moving.", "Protect your budget from costly car repairs."],
  ["Compare car insurance prices from several companies with one quick form. Get help from a licensed agent whenever you need it.", "A vehicle service contract helps pay for engine, transmission and other major repairs after your factory warranty ends. See plan prices for your car in a few minutes."],
  ["Our goal is simple: take the stress out of car repairs and surprise maintenance. Repair bills can be expensive and often arrive at the worst possible time. At {company}, we're committed to service you can count on, protecting your budget from unexpected repair costs and giving you the confidence that help is always just a phone call away.", "Our goal is simple: take the stress out of car repairs. Repair bills can be expensive and often arrive at the worst possible time. A {company} vehicle service contract helps protect your budget, and real people are always a phone call away."],
  ["When your car breaks down without warning, {company} has your back. We handle covered repairs quickly and efficiently so you can get back on the road.", "Our team talks you through your options and answers your questions before you decide anything."],
  ["Choose from several customizable plans. We'll help you find coverage that fits your vehicle and your budget. Call us for a free quote.", "Choose from powertrain to complete plans, with terms and deductibles that fit your car and your budget."],
  ["What is an extended auto warranty?", "What is a vehicle service contract?"],
  ["An extended auto warranty is a vehicle service contract that pays for unexpected repairs and replacement parts, such as the engine, transmission and brake system, after your factory warranty runs out.", "A vehicle service contract, often called an extended car warranty, is an optional contract that pays for repairs and replacement parts it lists, such as the engine, transmission and brake system, after your factory warranty runs out. It isn't insurance."],
  ["Can I buy an extended warranty after I've bought my car?", "Can I buy a vehicle service contract after I've bought my car?"],
  ["Yes. You can purchase an extended warranty at any time, not just when you buy the vehicle.", "Yes. You can buy one at any time, not just when you buy the vehicle."],
  ["What does an extended auto warranty cover?", "What does a vehicle service contract include?"],
  ["Our basic plan covers the engine, transmission, cooling system, brake system, electrical system and drive axle, plus trip interruption and roadside assistance. {company} offers several coverage levels, so you can choose the plan that fits your vehicle.", "It depends on the plan. Basic plans usually include the engine, transmission and drivetrain, and higher levels add systems such as cooling, brakes, electrical and air conditioning; some also include roadside assistance and trip interruption. The exact parts, exclusions and deductible are listed in each contract."],
  ["Is a car warranty the same as car insurance?", "Is a vehicle service contract the same as car insurance?"],
  ["No. Car insurance typically protects you after an accident, while a car warranty helps pay for repairs and replacement parts when something breaks down or fails.", "No. Car insurance pays for damage and injuries after an accident, and most states require it. A vehicle service contract is optional and pays for repairs when a listed part breaks down. It doesn't replace the insurance your state requires."],
  ["Can you buy a warranty for an older car?", "Can I get a vehicle service contract for an older car?"],
  ["Yes. Your vehicle's age doesn't matter, as long as it's in good working condition when you buy the plan.", "Often, yes. Many plans accept older and higher-mileage cars, as long as the car is in good working condition when you buy the plan. Eligibility depends on the plan."],
  ["Practical guides on car insurance, extended warranties and keeping repair costs down.", "Practical guides on extended car warranties, vehicle service contracts and keeping repair costs down."],
  ["Our goal is simple: take the stress out of car repairs and surprise breakdowns. Repair bills can be expensive and often arrive at the worst possible time. A {company} vehicle service contract helps protect your budget from unexpected repair costs, and help is always just a phone call away.", "Our goal is simple: take the stress out of car repairs. Repair bills can be expensive and often arrive at the worst possible time. A {company} vehicle service contract helps protect your budget, and real people are always a phone call away."],
  ["Unexpected Repairs", "Real People, Plain Answers"],
  ["When a part listed in your contract breaks down, {company} helps get the repair handled quickly so you can get back on the road.", "Our team talks you through your options and answers your questions before you decide anything."],
  ["Any ASE-Certified Repair Shop", "Backed by Trusted Providers"],
  ["You're never tied to one location. Take your vehicle to any ASE-certified technician, anywhere in the country.", "Every plan is backed and administered by an established vehicle service contract provider, so claims are handled by people who do this every day."],
  ["Flexible Plans", "Options That Fit You"],
  ["Choose from several plan levels. We'll help you find the plan that fits your vehicle and your budget. Call us for a free quote.", "Choose from powertrain to complete plans, with terms and deductibles that fit your car and your budget."],
  ["30-Day Money-Back Guarantee", "Free, No Obligation"],
  ["Your satisfaction comes first. If you're not happy with your plan for any reason within 30 days, {company} will refund you in full.", "Quotes are free, you can review the full contract before you buy, and every plan comes with a 30-day money-back guarantee."],
  ["Our basic plan includes the engine, transmission, cooling system, brake system, electrical system and drive axle, plus trip interruption and roadside assistance. {company} offers several plan levels, so you can choose the one that fits your vehicle. The exact parts, exclusions and deductible are listed in each contract.", "It depends on the plan. Basic plans usually include the engine, transmission and drivetrain, and higher levels add systems such as cooling, brakes, electrical and air conditioning; some also include roadside assistance and trip interruption. The exact parts, exclusions and deductible are listed in each contract."],
  ["Our goal is simple: help you find the right protection for your car and your budget. Car insurance and repair protection can be confusing, so our team explains your options in plain English and connects you with authorized companies that can help.", "Our goal is simple: take the stress out of car repairs. Repair bills can be expensive and often arrive at the worst possible time. A {company} vehicle service contract helps protect your budget, and real people are always a phone call away."],
  ["Connected With Authorized Companies", "Backed by Trusted Providers"],
  ["When you're ready, we connect you directly with an authorized insurance company or vehicle service contract provider.", "Every plan is backed and administered by an established vehicle service contract provider, so claims are handled by people who do this every day."],
  ["Quotes are free and you decide whether to buy. The company you choose sets the price and contract terms, and you can review them first.", "Quotes are free, you can review the full contract before you buy, and every plan comes with a 30-day money-back guarantee."],
  ["Prices shown are estimates based on the information you provided. Your final price is set by the insurance company after it reviews your driving record and other details.", "Prices shown are estimates based on your car's year, make and mileage. Your exact price depends on the plan, term and deductible you choose, and we confirm it before you buy."],
  ["Practical guides on car insurance, vehicle service contracts and keeping repair costs down.", "Practical guides on extended car warranties, vehicle service contracts and keeping repair costs down."],
  ["See how much you could save", "Worried about your next repair bill?"],
  ["Compare car insurance quotes from several companies in about 3 minutes. Free, no obligation.", "See estimated extended car warranty prices for your car in a few minutes. Free, no obligation."],
  ["Car insurance & vehicle service contracts", "Extended car warranty plans"],
  ["Protect your car and your budget.", "Protect your budget from costly car repairs."],
  ["Compare car insurance quotes from several companies, or get a price on a vehicle service contract that helps pay for costly repairs. Two separate products, one place to start.", "A vehicle service contract helps pay for engine, transmission and other major repairs after your factory warranty ends. See plan prices for your car in a few minutes."],
  ["Our goal is simple: help you protect your car and your budget. Our licensed agents compare car insurance quotes for you, and our team helps you choose a vehicle service contract plan for repair bills, all explained in plain English.", "Our goal is simple: take the stress out of car repairs. Repair bills can be expensive and often arrive at the worst possible time. A {company} vehicle service contract helps protect your budget, and real people are always a phone call away."],
  ["Quotes From Companies We Trust", "Backed by Trusted Providers"],
  ["We compare options from the insurance companies and service contract providers we work with, so you see more than one price.", "Every plan is backed and administered by an established vehicle service contract provider, so claims are handled by people who do this every day."],
  ["Car insurance, a vehicle service contract or both: we explain the difference so you can choose what fits your car and budget.", "Choose from powertrain to complete plans, with terms and deductibles that fit your car and your budget."],
  ["Quotes are free and you decide whether to buy. You can review the full policy or contract terms first.", "Quotes are free, you can review the full contract before you buy, and every plan comes with a 30-day money-back guarantee."],
  ["No. Car insurance pays for damage and injuries after an accident, and most states require it. A vehicle service contract is optional and pays for repairs when a listed part breaks down. Many drivers have both, and you can get a quote for each here.", "No. Car insurance pays for damage and injuries after an accident, and most states require it. A vehicle service contract is optional and pays for repairs when a listed part breaks down. It doesn't replace the insurance your state requires."],
]);
const upgradeText = (t: string) => OLD_DEFAULT_TEXT.get(t) ?? t;

function upgradeOldDefaults(out: Settings) {
  const c = out.content;
  c.hero = { eyebrow: upgradeText(c.hero.eyebrow), title: upgradeText(c.hero.title), subtitle: upgradeText(c.hero.subtitle) };
  c.whyIntro = upgradeText(c.whyIntro);
  c.reasons = c.reasons.map((r) => ({ title: upgradeText(r.title), body: upgradeText(r.body) }));
  c.faqs = c.faqs.map((f) => ({ q: upgradeText(f.q), a: upgradeText(f.a) }));
  out.blog.intro = upgradeText(out.blog.intro);
  out.blog.ctaTitle = upgradeText(out.blog.ctaTitle);
  out.blog.ctaText = upgradeText(out.blog.ctaText);
  out.results.disclaimer = upgradeText(out.results.disclaimer);
  // Old default texts are replaced by the current defaults. Consent text only changes together with its version, so each lead still
  // records exactly what it agreed to.
  const b = out.business;
  // Licensed-agency defaults (2026-10-07) -> service contracts only (2026-10-08).
  if (b.licenseNote === "Licensed insurance agency. License numbers available on request.") b.licenseNote = site.licenseNote;
  if (b.vscConsentText === "By clicking “Get my quote”, I agree that Vertex AutoCare, its licensed agents, and the vehicle service contract providers and insurance companies it works with may contact me about vehicle service contracts and related products, such as car insurance, at the phone number and email I provided, including by calls and texts that may use automated technology or prerecorded messages. Consent is not required to buy. Message and data rates may apply. I also agree to the Privacy Policy and Terms of Use.") { b.vscConsentText = site.vscConsentText; b.vscConsentVersion = site.vscConsentVersion; }
  // Referral-service defaults (2026-10-04) -> licensed agency defaults (2026-10-07).
  if (b.licenseNote === "Vertex AutoCare is a marketing and referral service. We are not an insurance company, insurance agency or vehicle service contract provider; we connect you with authorized companies that provide quotes, coverage and contracts.") b.licenseNote = site.licenseNote;
  if (b.consentText === "By clicking \u201cSee my quotes\u201d, I agree that Vertex AutoCare and the insurance companies, agents and vehicle service contract providers it works with may contact me about car insurance and related products, such as vehicle service contracts, at the phone number and email I provided, including by calls and texts that may use automated technology or prerecorded messages. Consent is not required to buy. Message and data rates may apply. I also agree to the Privacy Policy and Terms of Use.") { b.consentText = site.consentText; b.consentVersion = site.consentVersion; }
  if (b.vscConsentText === "By clicking \u201cGet my quote\u201d, I agree that Vertex AutoCare and the vehicle service contract providers, insurance companies and agents it works with may contact me about vehicle service contracts and related products, such as car insurance, at the phone number and email I provided, including by calls and texts that may use automated technology or prerecorded messages. Consent is not required to buy. Message and data rates may apply. I also agree to the Privacy Policy and Terms of Use.") { b.vscConsentText = site.vscConsentText; b.vscConsentVersion = site.vscConsentVersion; }
  if (b.licenseNote === "Licensed insurance agency. National Producer Number: 0000000. State license numbers available on request.") b.licenseNote = site.licenseNote;
  if (b.consentText === "By clicking \u201cSee my quotes\u201d, I agree that Vertex AutoCare and its licensed agents may contact me about insurance at the phone number and email I provided, including by calls and texts that may use automated technology or prerecorded messages. Consent is not required to buy. Message and data rates may apply. I also agree to the Privacy Policy and Terms of Use.") { b.consentText = site.consentText; b.consentVersion = site.consentVersion; }
  if (b.vscConsentText === "By clicking \u201cGet my quote\u201d, I agree that Vertex AutoCare and the vehicle service contract providers it works with may contact me about vehicle service contracts at the phone number and email I provided, including by calls and texts that may use automated technology or prerecorded messages. Consent is not required to buy. Message and data rates may apply. I also agree to the Privacy Policy and Terms of Use.") { b.vscConsentText = site.vscConsentText; b.vscConsentVersion = site.vscConsentVersion; }
}

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
  upgradeOldDefaults(out);
  return out;
}

// Section links from before the site had separate pages now point at those pages.
// The car insurance pages were retired in October 2026; their links point to the service contract quote.
const OLD_ANCHORS: Record<string, string> = {
  "/#repair-costs": "/repair-costs",
  "/#why-choose": "/why-us",
  "/#faq": "/faq",
  "/privacy#do-not-sell": "/do-not-sell",
  "/quote": "/quote/vehicle-protection",
  "/quote/auto": "/quote/vehicle-protection",
};
// Menu links to the retired car insurance state guides are dropped.
const retired = (l: Partial<MenuItem>) => String(l.href ?? "").startsWith("/car-insurance");

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
  const ctaHref = OLD_ANCHORS[nav.ctaHref] ?? nav.ctaHref;
  return {
    ...nav,
    ctaHref,
    links: (nav.links ?? []).filter((l) => !retired(l)).map((l) => item(l, 0)),
    sticky: nav.sticky ?? true,
    announcement: { ...DEFAULTS.navigation.announcement, ...(nav.announcement ?? {}) },
    footerColumns: (nav.footerColumns ?? DEFAULTS.navigation.footerColumns).map((c, i) => ({
      id: c.id || `c${i}`,
      title: String(c.title ?? ""),
      links: (c.links ?? []).filter((l) => !retired(l)).map((l) => item(l, 1)),
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
