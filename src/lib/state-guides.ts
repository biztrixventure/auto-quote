import type { Prisma, StateGuide } from "@prisma/client";
import { db } from "./db";
import { researchFields } from "./state-guide-research";
import { STATES } from "./states";

// State-by-state car insurance guides (/car-insurance/<slug>). The page text is built from
// each state's requirement facts, which an admin checks before publishing.

export const stateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const guidePath = (g: Pick<StateGuide, "slug">) => `/car-insurance/${g.slug}`;
export const livePublished: Prisma.StateGuideWhereInput = { published: true };

const k = (n: number) => (n % 1000 === 0 ? String(n / 1000) : (n / 1000).toFixed(1));
export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** "30/60/25" (thousands), or "" when no bodily injury minimum is set. */
export function limitsShort(g: Pick<StateGuide, "biPerPerson" | "biPerAccident" | "pd">) {
  if (!g.biPerPerson) return ""; // e.g. Florida: no bodily injury requirement, so no "x/y/z"
  return `${k(g.biPerPerson)}/${k(g.biPerAccident)}/${k(g.pd)}`;
}

/** Neighbouring states, for internal links between guides. */
export const NEIGHBORS: Record<string, string[]> = {
  AL: ["FL", "GA", "MS", "TN"], AK: ["WA"], AZ: ["CA", "CO", "NM", "NV", "UT"], AR: ["LA", "MO", "MS", "OK", "TN", "TX"],
  CA: ["AZ", "NV", "OR"], CO: ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"], CT: ["MA", "NY", "RI"], DE: ["MD", "NJ", "PA"],
  DC: ["MD", "VA"], FL: ["AL", "GA"], GA: ["AL", "FL", "NC", "SC", "TN"], HI: ["CA"], ID: ["MT", "NV", "OR", "UT", "WA", "WY"],
  IL: ["IA", "IN", "KY", "MO", "WI"], IN: ["IL", "KY", "MI", "OH"], IA: ["IL", "MN", "MO", "NE", "SD", "WI"],
  KS: ["CO", "MO", "NE", "OK"], KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"], LA: ["AR", "MS", "TX"], ME: ["NH"],
  MD: ["DC", "DE", "PA", "VA", "WV"], MA: ["CT", "NH", "NY", "RI", "VT"], MI: ["IN", "OH", "WI"], MN: ["IA", "ND", "SD", "WI"],
  MS: ["AL", "AR", "LA", "TN"], MO: ["AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN"], MT: ["ID", "ND", "SD", "WY"],
  NE: ["CO", "IA", "KS", "MO", "SD", "WY"], NV: ["AZ", "CA", "ID", "OR", "UT"], NH: ["MA", "ME", "VT"], NJ: ["DE", "NY", "PA"],
  NM: ["AZ", "CO", "OK", "TX", "UT"], NY: ["CT", "MA", "NJ", "PA", "VT"], NC: ["GA", "SC", "TN", "VA"], ND: ["MN", "MT", "SD"],
  OH: ["IN", "KY", "MI", "PA", "WV"], OK: ["AR", "CO", "KS", "MO", "NM", "TX"], OR: ["CA", "ID", "NV", "WA"],
  PA: ["DE", "MD", "NJ", "NY", "OH", "WV"], RI: ["CT", "MA"], SC: ["GA", "NC"], SD: ["IA", "MN", "MT", "ND", "NE", "WY"],
  TN: ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"], TX: ["AR", "LA", "NM", "OK"], UT: ["AZ", "CO", "ID", "NM", "NV", "WY"],
  VT: ["MA", "NH", "NY"], VA: ["DC", "KY", "MD", "NC", "TN", "WV"], WA: ["ID", "OR"], WV: ["KY", "MD", "OH", "PA", "VA"],
  WI: ["IA", "IL", "MI", "MN"], WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
};

/**
 * Creates any missing state rows, pre-filled from the researched starting data. They start
 * unpublished and unchecked. Safe to call repeatedly.
 */
export async function ensureStateGuides() {
  const count = await db.stateGuide.count();
  if (count >= STATES.length) return;
  await db.stateGuide.createMany({
    data: STATES.map((s) => ({ code: s.code, name: s.name, slug: stateSlug(s.name), ...(researchFields(s.code) ?? {}) })),
    skipDuplicates: true,
  });
}

export type GuideFacts = Pick<
  StateGuide,
  "name" | "biPerPerson" | "biPerAccident" | "pd" | "noFault" | "pipRequired" | "pipMinimum" | "umRequired" | "uimRequired" | "medPayRequired" | "insuranceOptional" | "requirementNote"
>;

/** One-paragraph plain answer: used in the "Quick answer" box, meta descriptions and llms.txt. */
export function quickAnswer(g: GuideFacts) {
  const parts: string[] = [];
  const short = limitsShort(g);
  if (g.insuranceOptional) {
    parts.push(`${g.name} doesn't require car insurance, but drivers must be able to pay for damage they cause${short ? ` (${short} financial responsibility)` : ""}. Most drivers buy a policy to meet this.`);
    return parts.join(" ");
  }
  if (g.biPerPerson) {
    parts.push(`${g.name} requires at least ${usd(g.biPerPerson)} of bodily injury liability per person, ${usd(g.biPerAccident)} per accident and ${usd(g.pd)} of property damage liability (${short}).`);
  } else if (g.pd) {
    parts.push(`${g.name} requires at least ${usd(g.pd)} of property damage liability.`);
  }
  if (g.pipRequired) parts.push(`Personal injury protection (PIP) is required${g.pipMinimum ? `, at least ${usd(g.pipMinimum)}` : ""}.`);
  const extra = [g.umRequired && "uninsured motorist", g.uimRequired && "underinsured motorist", g.medPayRequired && "medical payments"].filter(Boolean);
  if (extra.length) parts.push(`${capital(listJoin(extra as string[]))} coverage is also required.`);
  parts.push(g.noFault ? `${g.name} is a no-fault state.` : `${g.name} is an at-fault state, so the driver who causes a crash pays for the damage.`);
  return parts.join(" ");
}

/** Search result description (max 160 characters), stating the state's actual minimums. */
export function metaDescription(g: GuideFacts) {
  const short = limitsShort(g);
  const pip = g.pipRequired && g.pipMinimum ? ` plus ${usd(g.pipMinimum)} PIP` : g.pipRequired ? " plus PIP" : "";
  const fault = g.noFault ? "No-fault state." : "At-fault state.";
  const text = g.insuranceOptional
    ? `${g.name} doesn't require car insurance, but drivers must be able to pay for crash damage${short ? ` (${short})` : ""}. What that means and how to compare quotes.`
    : short
      ? `${g.name} requires ${short} liability car insurance${pip}. ${fault} See what's required, what's worth adding and how to save.`
      : `${g.name} requires ${usd(g.pd)} property damage liability${pip}. ${fault} See what's required, what's worth adding and how to save.`;
  return text.length <= 160 ? text : text.slice(0, 157).replace(/\s+\S*$/, "") + "…";
}

export type Faq = { q: string; a: string };

/** Questions people actually search for, answered from the state's facts. */
export function stateFaqs(g: GuideFacts): Faq[] {
  const short = limitsShort(g);
  const faqs: Faq[] = [];
  if (g.insuranceOptional) {
    faqs.push({
      q: `Is car insurance required in ${g.name}?`,
      a: `No, ${g.name} doesn't require car insurance. But if you cause a crash, you must show you can pay for the damage${short ? ` (at least ${short})` : ""}, or you can lose your license and registration. That's why most drivers carry a policy.`,
    });
  } else if (g.biPerPerson || g.pd) {
    faqs.push({
      q: `What is the minimum car insurance required in ${g.name}?`,
      a: g.biPerPerson
        ? `The legal minimum in ${g.name} is ${short} liability: ${usd(g.biPerPerson)} for injuries to one person, ${usd(g.biPerAccident)} for all injuries in one accident, and ${usd(g.pd)} for damage to other people's property.${g.pipRequired ? ` You also need personal injury protection${g.pipMinimum ? ` of at least ${usd(g.pipMinimum)}` : ""}.` : ""}`
        : `${g.name} requires ${usd(g.pd)} of property damage liability.${g.pipRequired ? ` You also need personal injury protection${g.pipMinimum ? ` of at least ${usd(g.pipMinimum)}` : ""}.` : ""}`,
    });
  }
  faqs.push({
    q: `Is ${g.name} a no-fault state?`,
    a: g.noFault
      ? `Yes. In ${g.name}, your own personal injury protection pays your medical bills after a crash, no matter who caused it. You can usually only sue the other driver for serious injuries.`
      : `No. ${g.name} is an at-fault (tort) state: the driver who causes the accident, and their insurance company, pays for the other people's injuries and damage.`,
  });
  faqs.push({
    q: `Is uninsured motorist coverage required in ${g.name}?`,
    a: g.umRequired && g.insuranceOptional
      ? `Only if you buy a policy. ${g.name} doesn't require car insurance, but any policy you buy must include uninsured motorist coverage, which pays for your injuries if a driver without insurance hits you.`
      : g.umRequired
      ? `Yes. ${g.name} requires uninsured motorist coverage, which pays for your injuries if a driver without insurance hits you.${g.uimRequired ? " Underinsured motorist coverage is required too." : ""}`
      : `No, it isn't required in ${g.name}, but it's worth having: it pays for your injuries if you're hit by a driver with no insurance or not enough insurance.`,
  });
  if (g.biPerPerson) {
    faqs.push({
      q: `Is the state minimum enough coverage in ${g.name}?`,
      a: `Usually not. A serious crash can easily cost more than ${usd(g.biPerAccident)} in medical bills, and you're personally responsible for anything above your limits. Many drivers choose 100/300/100 liability for much stronger protection, often for a modest extra cost.`,
    });
  }
  if (!g.insuranceOptional) faqs.push({
    q: `What happens if I drive without insurance in ${g.name}?`,
    a: `Driving without the required coverage in ${g.name} can lead to fines, a suspended license or registration, and having to file proof of insurance (such as an SR-22) before you can drive again. Penalties increase for repeat offenses.`,
  });
  return faqs;
}

function listJoin(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Can this guide be published? Facts must be checked and a minimum must be filled in. */
export function publishProblem(g: Pick<StateGuide, "verifiedAt" | "biPerPerson" | "pd">) {
  if (!g.verifiedAt) return "Check the requirement facts against the official source and tick “Facts checked” first.";
  if (!g.biPerPerson && !g.pd) return "Enter the minimum coverage amounts first.";
  return null;
}
