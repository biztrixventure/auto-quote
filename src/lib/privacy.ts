import { db } from "./db";

/** Normalises what an admin typed: lower-case email, 10-digit US phone. */
export function normalizeIdentity(emailRaw: string, phoneRaw: string) {
  const email = emailRaw.trim().toLowerCase().slice(0, 200);
  const phone = phoneRaw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").slice(0, 10);
  return { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "", phone: phone.length === 10 ? phone : "" };
}

/** Every lead belonging to this email and/or phone, with all related records. */
export function findPerson(email: string, phone: string) {
  const or = [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])];
  if (or.length === 0) return Promise.resolve([]);
  return db.lead.findMany({
    where: { OR: or },
    orderBy: { createdAt: "desc" },
    include: { drivers: true, vehicles: true, quotes: true, consent: true, sales: true, notes: true, tasks: true },
  });
}

/** Masked identifiers for logs, e.g. "j***@example.com · ***0100". */
export function mask(email: string, phone: string) {
  const e = email ? `${email[0]}***${email.slice(email.indexOf("@"))}` : "";
  const p = phone ? `***${phone.slice(-4)}` : "";
  return [e, p].filter(Boolean).join(" · ") || "unknown";
}
