// The site sells vehicle service contracts only. "auto" (car insurance) stays here so leads from
// before October 2026 still show correctly in the admin. A vehicle service contract is NOT
// insurance, so its copy never uses insurance words (policy, premium, insurer).

export const PRODUCTS = {
  auto: { label: "Car insurance", short: "Insurance", quoteHref: "/quote/auto" },
  vsc: { label: "Vehicle service contract", short: "Service contract", quoteHref: "/quote/vehicle-protection" },
} as const;

export type ProductLine = keyof typeof PRODUCTS;

export const productOf = (line: string): ProductLine => (line === "vsc" ? "vsc" : "auto");
export const productLabel = (line: string) => PRODUCTS[productOf(line)].label;

/** Shown next to every service contract offer. */
export const VSC_DISCLOSURE =
  "A vehicle service contract is not insurance. It's an optional contract that pays for repairs to the parts it lists, subject to its terms, exclusions and deductible.";
