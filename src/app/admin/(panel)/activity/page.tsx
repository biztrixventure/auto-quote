import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ERROR_ACTIONS, describe, entityLink } from "@/components/admin/activity";
import { PageHeader, btnSecondary, dateTime, timeAgo } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
const PAGE = 50;

type Search = { actor?: string; errors?: string; page?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const errorsOnly = sp.errors === "1";
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.actor ? { actor: sp.actor } : {}),
    ...(errorsOnly ? { action: { in: ERROR_ACTIONS } } : {}),
  };
  const [rows, total, actors] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where }),
    db.auditLog.groupBy({ by: ["actor"], _count: true, orderBy: { _count: { actor: "desc" } }, take: 30 }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (over: Partial<Search>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ actor: sp.actor, errors: errorsOnly ? "1" : undefined, ...over })) if (v) p.set(k, v);
    return `/admin/activity${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Activity log" subtitle="Everything people and the system have done, newest first. Entries can't be edited or deleted." />
      <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <form className="flex flex-wrap items-end gap-3 border-b border-[#EEF0F3] p-4 text-sm">
          <label className="font-medium">
            Who
            <select name="actor" defaultValue={sp.actor ?? ""} className="ml-2 h-9 rounded-lg border border-[#D0D5DD] bg-white px-2">
              <option value="">Everyone</option>
              {actors.map((a) => <option key={a.actor} value={a.actor}>{a.actor} ({a._count})</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="errors" value="1" defaultChecked={errorsOnly} className="h-4 w-4 accent-sky" />
            Errors and failed sign-ins only
          </label>
          <button className="h-9 rounded-lg bg-asphalt px-3 font-semibold text-white hover:bg-road">Filter</button>
          {(sp.actor || errorsOnly) && <Link href="/admin/activity" className="h-9 rounded-lg border border-[#D0D5DD] px-3 py-1.5 font-semibold">Clear</Link>}
        </form>
        <ul className="divide-y divide-[#EEF0F3]">
          {rows.length === 0 && <li className="px-4 py-12 text-center text-sm text-road">Nothing matches these filters.</li>}
          {rows.map((r) => {
            const e = describe(r.action, r.detail);
            const link = entityLink(r.entity, r.entityId);
            return (
              <li key={r.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-3">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.error ? "bg-red-500" : "bg-sky"}`} />
                  <span>
                    <span className={`font-medium ${e.error ? "text-red-700" : ""}`}>{e.text}</span>
                    {link && <Link href={link} className="ml-2 text-xs font-semibold text-sky hover:underline">Open</Link>}
                    <span className="block text-xs text-road">by {r.actor} · {r.entity}{r.entityId !== "*" ? ` ${r.entityId.slice(0, 12)}` : ""}</span>
                  </span>
                </span>
                <span className="pl-5 text-xs text-road sm:pl-0" title={dateTime(r.createdAt)}>{timeAgo(r.createdAt)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-[#EEF0F3] px-4 py-3 text-sm text-road">
          <span>{total.toLocaleString()} entries</span>
          <span className="flex items-center gap-2">
            {page > 1 && <Link href={href({ page: String(page - 1) })} className={btnSecondary}>← Newer</Link>}
            <span>Page {page} of {pages}</span>
            {page < pages && <Link href={href({ page: String(page + 1) })} className={btnSecondary}>Older →</Link>}
          </span>
        </div>
      </div>
    </>
  );
}
