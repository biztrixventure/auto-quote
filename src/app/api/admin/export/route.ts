import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { leadWhere } from "@/lib/admin-leads";
import { requireAdmin } from "@/lib/admin-guard";
import { productLabel } from "@/lib/products";

export const runtime = "nodejs";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Prevent spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

// Accepts the same ?q=, ?status= and ?product= filters as the admin leads page.
export async function GET(req: Request) {
  const me = await requireAdmin("admin"); // full PII export: admins and owners only
  const params = new URL(req.url).searchParams;
  const filters = { q: params.get("q") ?? undefined, status: params.get("status") ?? undefined, product: params.get("product") ?? undefined };
  const leads = await db.lead.findMany({ where: leadWhere(filters), orderBy: { createdAt: "desc" }, take: 5000, include: { quotes: true } });
  const header = ["created_at", "id", "product", "status", "state", "zip", "first_name", "last_name", "email", "phone", "utm_source", "utm_campaign", "routed_to", "quotes", "lowest_monthly", "lead_revenue"];
  const rows = leads.map((l) => [
    l.createdAt.toISOString(), l.id, productLabel(l.line), l.status, l.state, l.zip, l.firstName, l.lastName, l.email, l.phone,
    l.utmSource, l.utmCampaign, l.routedTo, l.quotes.length,
    l.quotes.length ? Math.min(...l.quotes.map((q) => q.monthlyPremium)) : "", l.leadRevenue,
  ]);
  await audit(me.email, "export_csv", "lead", "*", { count: leads.length, ...filters });
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
