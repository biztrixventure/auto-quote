import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { STATUS_COLORS, STATUS_LABELS } from "@/components/admin/statuses";
import { Card, PageHeader, StatusBadge, btnSecondary, money, timeAgo } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const DAYS = 30;

function Delta({ now, before }: { now: number; before: number }) {
  if (before === 0) return <span className="text-xs text-road/70">{now ? "New this period" : "No change"}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%<span className="font-normal text-road/70">vs previous {DAYS} days</span>
    </span>
  );
}

export default async function AdminDashboard() {
  const me = await requireAdmin("writer");
  if (me.role === "writer") redirect("/admin/blog"); // writers only have the blog
  const now = new Date();
  const myTasks = await db.leadTask.findMany({
    where: { assigneeId: me.id, doneAt: null },
    orderBy: { dueAt: "asc" },
    take: 8,
    include: { lead: { select: { id: true, firstName: true, lastName: true } } },
  });
  const start = new Date(now.getTime() - DAYS * DAY);
  const prevStart = new Date(now.getTime() - 2 * DAYS * DAY);
  const current = { createdAt: { gte: start } };
  const previous = { createdAt: { gte: prevStart, lt: start } };

  const [leads, prevLeads, quotedLeads, byStatus, prevSold, revenue, prevRevenue, bySource, recent, days] = await Promise.all([
    db.lead.count({ where: current }),
    db.lead.count({ where: previous }),
    db.lead.count({ where: { ...current, quotes: { some: {} } } }),
    db.lead.groupBy({ by: ["status"], where: current, _count: true }),
    db.lead.count({ where: { ...previous, status: "bound" } }),
    db.lead.aggregate({ where: current, _sum: { leadRevenue: true } }),
    db.lead.aggregate({ where: previous, _sum: { leadRevenue: true } }),
    db.lead.groupBy({ by: ["utmSource"], where: current, _count: true, orderBy: { _count: { utmSource: "desc" } }, take: 5 }),
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { vehicles: { take: 1 } } }),
    db.lead.findMany({ where: current, select: { createdAt: true } }),
  ]);

  const count = (k: string) => byStatus.find((s) => s.status === k)?._count ?? 0;
  const sold = count("bound");
  const quoteRate = leads ? Math.round((quotedLeads / leads) * 100) : 0;

  // Leads per day for the chart (UTC days, oldest first, ending today).
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(start.getTime() + (i + 1) * DAY);
    return { key: d.toISOString().slice(0, 10), date: d, n: 0 };
  });
  for (const { createdAt } of days) {
    const s = series.find((x) => x.key === createdAt.toISOString().slice(0, 10));
    if (s) s.n++;
  }
  const peak = Math.max(0, ...series.map((s) => s.n));
  const max = Math.max(1, peak);
  const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  const kpis = [
    { label: "New leads", value: leads.toLocaleString(), delta: <Delta now={leads} before={prevLeads} /> },
    { label: "Quote rate", value: `${quoteRate}%`, delta: <span className="text-xs text-road/70">{quotedLeads} of {leads} lead{leads === 1 ? "" : "s"} got quotes</span> },
    { label: "Policies sold", value: sold.toLocaleString(), delta: <Delta now={sold} before={prevSold} /> },
    {
      label: "Lead revenue",
      value: money(revenue._sum.leadRevenue ?? 0),
      delta: <Delta now={revenue._sum.leadRevenue ?? 0} before={prevRevenue._sum.leadRevenue ?? 0} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Last ${DAYS} days · updated ${now.toLocaleTimeString("en-US", { timeStyle: "short" })}`}
        actions={<Link href="/admin/leads" className={btnSecondary}>View all leads</Link>}
      />

      <div className="mb-6">
        <Card title={`My follow-ups (${myTasks.length}${myTasks.length === 8 ? "+" : ""})`} action={<Link href="/admin/leads?assigned=me" className="text-sm font-semibold text-sky hover:underline">My leads</Link>}>
          {myTasks.length === 0 ? (
            <p className="text-sm text-road">Nothing due. Add follow-ups from any lead page.</p>
          ) : (
            <ul className="-my-2 divide-y divide-[#EEF0F3]">
              {myTasks.map((t) => {
                const overdue = t.dueAt < now;
                return (
                  <li key={t.id}>
                    <Link href={`/admin/leads/${t.lead.id}`} className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 hover:bg-[#F9FAFB]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{t.title}</span>
                        <span className="block text-xs text-road">{t.lead.firstName} {t.lead.lastName}</span>
                      </span>
                      <span className={`shrink-0 text-xs font-semibold ${overdue ? "text-red-600" : "text-road"}`}>
                        {overdue ? "Overdue" : `Due ${t.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-sm font-medium text-road">{k.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{k.value}</p>
            <div className="mt-2">{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card title="Leads per day" action={<span className="text-xs text-road">{leads} total</span>}>
          <svg viewBox={`0 0 ${DAYS * 20} 160`} className="h-48 w-full" preserveAspectRatio="none" role="img" aria-label={`Leads per day over the last ${DAYS} days`}>
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1="0" x2={DAYS * 20} y1={150 - f * 140} y2={150 - f * 140} stroke="#EEF0F3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s, i) => {
              const h = s.n ? Math.max(4, (s.n / max) * 140) : 2;
              return (
                <rect key={s.key} x={i * 20 + 3} y={150 - h} width="14" height={h} rx="3" fill={s.n ? "#1F5FAD" : "#E4E7EC"}>
                  <title>{`${shortDate(s.date)}: ${s.n} lead${s.n === 1 ? "" : "s"}`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="mt-2 flex justify-between text-xs text-road/70">
            <span>{shortDate(series[0].date)}</span>
            <span>Busiest day: {peak} lead{peak === 1 ? "" : "s"}</span>
            <span>Today</span>
          </div>
        </Card>

        <Card title="Status breakdown">
          {leads === 0 ? (
            <p className="text-sm text-road">No leads in this period yet.</p>
          ) : (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[#EEF0F3]">
                {Object.keys(STATUS_LABELS).map((k) =>
                  count(k) ? <div key={k} style={{ width: `${(count(k) / leads) * 100}%`, background: STATUS_COLORS[k] }} /> : null,
                )}
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                {Object.entries(STATUS_LABELS).map(([k, label]) => (
                  <li key={k}>
                    <Link href={`/admin/leads?status=${k}`} className="flex items-center justify-between gap-3 hover:text-sky">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[k] }} />
                        {label}
                      </span>
                      <span className="font-semibold tabular-nums">{count(k)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card title="Latest leads" action={<Link href="/admin/leads" className="text-sm font-semibold text-sky hover:underline">See all</Link>}>
          {recent.length === 0 ? (
            <p className="text-sm text-road">No leads yet. Submit a test quote from the website.</p>
          ) : (
            <ul className="-my-2 divide-y divide-[#EEF0F3]">
              {recent.map((l) => {
                const v = l.vehicles[0];
                return (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 hover:bg-[#F9FAFB]">
                      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky/10 text-sm font-bold text-sky">
                        {l.firstName[0]}
                        {l.lastName[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {l.firstName} {l.lastName}
                        </span>
                        <span className="block truncate text-xs text-road">
                          {l.city}, {l.state}
                          {v ? ` · ${v.year} ${v.make} ${v.model}` : ""}
                        </span>
                      </span>
                      <span className="hidden text-xs text-road sm:block">{timeAgo(l.createdAt)}</span>
                      <StatusBadge status={l.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Top traffic sources">
          {bySource.length === 0 ? (
            <p className="text-sm text-road">No traffic data yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {bySource.map((s) => (
                <li key={s.utmSource ?? "direct"}>
                  <div className="flex justify-between">
                    <span className="font-medium">{s.utmSource ?? "Direct / none"}</span>
                    <span className="tabular-nums text-road">{s._count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EEF0F3]">
                    <div className="h-full rounded-full bg-sky" style={{ width: `${(s._count / Math.max(1, leads)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
