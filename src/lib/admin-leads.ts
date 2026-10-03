import type { Prisma } from "@prisma/client";

export const PAGE_SIZE = 25;

// One filter for the leads table and the CSV export, so an export matches what's on screen.
export function leadWhere({ q, status, assignedTo, product }: { q?: string; status?: string; assignedTo?: string | null; product?: string }): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  if (status) and.push({ status });
  // auto = car insurance, vsc = vehicle service contract
  if (product === "auto" || product === "vsc") and.push({ line: product });
  // undefined = anyone, null = unassigned, string = that user's id
  if (assignedTo !== undefined) and.push({ assignedToId: assignedTo });
  const term = q?.trim();
  if (term) {
    // PostgreSQL text matching is case-sensitive unless told otherwise.
    const like = (v: string) => ({ contains: v, mode: "insensitive" as const });
    const or: Prisma.LeadWhereInput[] = [
      { firstName: like(term) },
      { lastName: like(term) },
      { email: like(term) },
      { zip: { startsWith: term } },
      { city: like(term) },
    ];
    const digits = term.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ phone: { contains: digits } });
    const [first, ...rest] = term.split(/\s+/);
    if (rest.length) or.push({ AND: [{ firstName: like(first) }, { lastName: like(rest.join(" ")) }] });
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}
