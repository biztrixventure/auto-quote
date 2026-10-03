import { PRODUCTS, productOf } from "@/lib/products";

/** Which product a lead asked about: car insurance (blue) or a vehicle service contract (amber). */
export function ProductBadge({ line }: { line: string }) {
  const p = productOf(line);
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p === "vsc" ? "bg-amber-50 text-amber-800" : "bg-sky/10 text-sky"}`}>
      {PRODUCTS[p].short}
    </span>
  );
}
