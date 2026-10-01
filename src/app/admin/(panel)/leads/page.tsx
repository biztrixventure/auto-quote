import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { hasRole } from "@/lib/auth";
import { PAGE_SIZE, leadWhere } from "@/lib/admin-leads";
import { STATUS_LABELS } from "@/components/admin/statuses";
import { PageHeader, StatusBadge, btnPrimary, btnSecondary, dateTime, money, timeAgo } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; page?: string; assigned?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  // "me" = my leads, "none" = unassigned, anything else = everyone
  const assigned = sp.assigned === "me" || sp.assigned === "none" ? sp.assigned : undefined;
  const assignedTo = assigned === "me" ? me.id : assigned === "none" ? null : undefined;
  const q = sp.q?.trim() || undefined;
  const status = sp.status && sp.status in STATUS_LABELS ? sp.status : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const where = leadWhere({ q, status, assignedTo });

  const [total, leads, statusCounts, allCount] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { quotes: { select: { monthlyPremium: true } }, vehicles: { take: 1 }, assignedTo: { select: { name: true } } },
    }),
    db.lead.groupBy({ by: ["status"], where: leadWhere({ q, assignedTo }), _count: true }),
    db.lead.count({ where: leadWhere({ q, assignedTo }) }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = (over: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged: Search = { q, status, assigned, page: undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return p.toString();
  };
  const href = (over: Partial<Search>) => `/admin/leads${query(over) ? `?${query(over)}` : ""}`;
  const exportHref = `/api/admin/export${query({}) ? `?${query({})}` : ""}`;
  const tabs: [string | undefined, string, number][] = [
    [undefined, "All", allCount],
    ...Object.entries(STATUS_LABELS).map(([k, label]): [string, string, number] => [k, label, statusCounts.find((s) => s.status === k)?._count ?? 0]),
  ];
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={`${total.toLocaleString()} lead${total === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}${status ? ` · ${STATUS_LABELS[status]}` : ""}`}
        actions={
          hasRole(me, "admin") && (
          <a href={exportHref} className={btnSecondary}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Export {q || status ? "filtered" : "all"} to CSV
          </a>
          )
        }
      />

      <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="space-y-3 border-b border-[#EEF0F3] p-4">
          <form action="/admin/leads" className="flex gap-2" role="search">
            {status && <input type="hidden" name="status" value={status} />}
            {assigned && <input type="hidden" name="assigned" value={assigned} />}
            <label htmlFor="lead-search" className="sr-only">Search leads</label>
            <div className="relative flex-1 sm:max-w-md">
              <svg aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-road/60" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input
                id="lead-search"
                name="q"
                defaultValue={q}
                placeholder="Name, email, phone, ZIP or city"
                className="h-10 w-full rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-sm focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15"
              />
            </div>
            <button className={btnPrimary}>Search</button>
            {q && <Link href={href({ q: undefined })} className={btnSecondary}>Clear</Link>}
          </form>
          <nav aria-label="Filter by owner" className="flex gap-1 text-sm">
            {([[undefined, "Everyone"], ["me", "My leads"], ["none", "Unassigned"]] as const).map(([k, label]) => (
              <Link
                key={label}
                href={href({ assigned: k })}
                aria-current={assigned === k ? "page" : undefined}
                className={`rounded-lg border px-3 py-1.5 font-medium ${assigned === k ? "border-sky bg-sky/5 text-sky" : "border-[#E4E7EC] text-road hover:bg-[#F9FAFB]"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map(([k, label, n]) => {
              const active = status === k;
              return (
                <Link
                  key={label}
                  href={href({ status: k })}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-asphalt text-white" : "text-road hover:bg-[#F2F4F7]"
                  }`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-[#F2F4F7]"}`}>{n}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
              <tr>
                {["Lead", "Phone", "Location", "Vehicle", "Source", "Status", "Assigned", "Lowest quote", "Received"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F3]">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="font-semibold">No leads found</p>
                    <p className="mt-1 text-sm text-road">
                      {q || status ? "Try a different search or status." : "Leads will appear here when someone submits the quote form."}
                    </p>
                  </td>
                </tr>
              )}
              {leads.map((l) => {
                const low = l.quotes.length ? Math.min(...l.quotes.map((x) => x.monthlyPremium)) : null;
                const v = l.vehicles[0];
                return (
                  <tr key={l.id} className="group hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${l.id}`} className="font-semibold text-asphalt group-hover:text-sky">
                        {l.firstName} {l.lastName}
                        {l.doNotContact && <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 align-middle text-[10px] font-bold text-white">DNC</span>}
                      </Link>
                      <span className="block text-xs text-road">{l.email}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <a href={`tel:${l.phone}`} className="hover:text-sky">{l.phone}</a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {l.city}, {l.state} {l.zip}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{v ? `${v.year} ${v.make} ${v.model}` : "—"}</td>
                    <td className="px-4 py-3">{l.utmSource ?? <span className="text-road/70">Direct</span>}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3">{l.assignedTo?.name ?? <span className="text-road/60">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">{low ? `${money(low)}/mo` : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3" title={dateTime(l.createdAt)}>{timeAgo(l.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#EEF0F3] px-4 py-3 text-sm text-road sm:flex-row">
          <span>
            Showing <strong className="text-asphalt">{from}–{to}</strong> of <strong className="text-asphalt">{total.toLocaleString()}</strong>
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={href({ page: String(page - 1) })} className={btnSecondary}>← Previous</Link>
            ) : (
              <span className={`${btnSecondary} pointer-events-none opacity-40`}>← Previous</span>
            )}
            <span className="px-2">Page {page} of {pages}</span>
            {page < pages ? (
              <Link href={href({ page: String(page + 1) })} className={btnSecondary}>Next →</Link>
            ) : (
              <span className={`${btnSecondary} pointer-events-none opacity-40`}>Next →</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
