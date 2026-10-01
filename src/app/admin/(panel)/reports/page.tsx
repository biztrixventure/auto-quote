import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { STATES } from "@/lib/states";
import { Card, PageHeader, money } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const DAY = 24 * 3600 * 1000;
const STEP_NAMES = ["Location", "Vehicle", "Driver", "History", "Coverage", "Contact", "Submitted"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

type Row = { key: string; leads: number; quoted: number; sold: number; leadsSold: number; revenue: number };

function group<T>(items: T[], keyOf: (t: T) => string, fill: (r: Row, t: T) => void) {
  const map = new Map<string, Row>();
  for (const it of items) {
    const k = keyOf(it);
    const r = map.get(k) ?? { key: k, leads: 0, quoted: 0, sold: 0, leadsSold: 0, revenue: 0 };
    fill(r, it);
    map.set(k, r);
  }
  return [...map.values()].sort((a, b) => b.leads - a.leads);
}

function Table({ title, rows, first }: { title: string; rows: Row[]; first: string }) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-road">No leads in this period.</p>
      ) : (
        <div className="-mx-5 -my-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
              <tr>{[first, "Leads", "Quote rate", "Policies sold", "Leads sold", "Lead revenue"].map((h) => <th key={h} scope="col" className="px-5 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F3] tabular-nums">
              {rows.slice(0, 15).map((r) => (
                <tr key={r.key}>
                  <td className="px-5 py-2.5 font-medium">{r.key}</td>
                  <td className="px-5 py-2.5">{r.leads}</td>
                  <td className="px-5 py-2.5">{pct(r.quoted, r.leads)}</td>
                  <td className="px-5 py-2.5">{r.sold}</td>
                  <td className="px-5 py-2.5">{r.leadsSold}</td>
                  <td className="px-5 py-2.5">{money(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const today = new Date();
  const parse = (v: string | undefined, fallback: Date) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? new Date(`${v}T00:00:00Z`) : fallback);
  const from = parse(sp.from, new Date(today.getTime() - 29 * DAY));
  const to = parse(sp.to, today);
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) + DAY); // inclusive end date
  const range = { gte: new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())), lt: end };

  const [leads, funnel] = await Promise.all([
    db.lead.findMany({
      where: { createdAt: range },
      select: { createdAt: true, state: true, status: true, utmSource: true, utmCampaign: true, leadRevenue: true, _count: { select: { quotes: true } } },
    }),
    db.funnelEvent.groupBy({ by: ["step"], where: { createdAt: range }, _count: true }),
  ]);

  const fill = (r: Row, l: (typeof leads)[number]) => {
    r.leads++;
    if (l._count.quotes > 0) r.quoted++;
    if (l.status === "bound") r.sold++;
    if (l.status === "sold_lead") r.leadsSold++;
    r.revenue += l.leadRevenue ?? 0;
  };
  const stateName = (c: string) => STATES.find((s) => s.code === c)?.name ?? c;
  const total = group(leads, () => "All", fill)[0] ?? { leads: 0, quoted: 0, sold: 0, leadsSold: 0, revenue: 0 };
  const byState = group(leads, (l) => stateName(l.state), fill);
  const bySource = group(leads, (l) => l.utmSource ?? "Direct / none", fill);
  const byCampaign = group(leads.filter((l) => l.utmCampaign), (l) => l.utmCampaign!, fill);

  const steps = STEP_NAMES.map((name, i) => ({ name, n: funnel.find((f) => f.step === i)?._count ?? 0 }));
  const started = steps[0].n || 1;

  const preset = (days: number) => `?${new URLSearchParams({ from: iso(new Date(today.getTime() - (days - 1) * DAY)), to: iso(today) })}`;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${iso(range.gte)} to ${iso(new Date(end.getTime() - DAY))}`}
        actions={
          <form className="flex flex-wrap items-end gap-2 text-sm">
            {[7, 30, 90].map((d) => (
              <Link key={d} href={preset(d)} className="rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 font-semibold hover:bg-[#F9FAFB]">Last {d} days</Link>
            ))}
            <label className="text-road">From<input type="date" name="from" defaultValue={iso(range.gte)} className="ml-1.5 h-9 rounded-lg border border-[#D0D5DD] px-2" /></label>
            <label className="text-road">To<input type="date" name="to" defaultValue={iso(new Date(end.getTime() - DAY))} className="ml-1.5 h-9 rounded-lg border border-[#D0D5DD] px-2" /></label>
            <button className="h-9 rounded-lg bg-asphalt px-3 font-semibold text-white hover:bg-road">Apply</button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Leads", total.leads.toLocaleString()],
          ["Quote rate", pct(total.quoted, total.leads)],
          ["Policies sold", total.sold.toLocaleString()],
          ["Lead revenue", money(total.revenue)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <p className="text-sm font-medium text-road">{k}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Card title="Quote form drop-off">
          {steps[0].n === 0 ? (
            <p className="text-sm text-road">No quote-form visits recorded in this period yet. Data starts from when this report was added.</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((s, i) => {
                const width = Math.max(2, (s.n / started) * 100);
                const lost = i > 0 ? steps[i - 1].n - s.n : 0;
                return (
                  <li key={s.name} className="grid grid-cols-[110px_1fr_150px] items-center gap-3 text-sm">
                    <span className="font-medium">{i < 6 ? `${i + 1}. ` : ""}{s.name}</span>
                    <span className="h-7 overflow-hidden rounded-md bg-[#EEF0F3]">
                      <span className={`flex h-full items-center rounded-md px-2 text-xs font-semibold text-white ${i === 6 ? "bg-emerald-600" : "bg-sky"}`} style={{ width: `${width}%` }}>
                        {s.n.toLocaleString()}
                      </span>
                    </span>
                    <span className="text-xs text-road">
                      {pct(s.n, started)} of starters
                      {i > 0 && lost > 0 && <span className="block text-red-600">−{lost.toLocaleString()} left here</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-4 text-xs text-road">Anonymous: counts browser sessions that reached each step. No personal details are recorded.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Table title="By traffic source" rows={bySource} first="Source" />
        <Table title="By campaign" rows={byCampaign} first="Campaign" />
        <Table title="By state" rows={byState} first="State" />
      </div>
    </>
  );
}
