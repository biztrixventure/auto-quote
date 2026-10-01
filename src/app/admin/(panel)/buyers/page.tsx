import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { list } from "@/lib/pricing";
import { STATES } from "@/lib/states";
import { Checkbox, FormField, Notice, SectionFooter, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary, btnSecondary, money } from "@/components/admin/ui";
import { deleteBuyer, saveBuyer, testBuyer, toggleBuyer } from "./actions";

export const dynamic = "force-dynamic";

export default async function BuyersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; edit?: string; new?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [buyers, sales] = await Promise.all([
    db.leadBuyer.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.leadSale.groupBy({ by: ["buyer", "accepted"], where: { createdAt: { gte: since } }, _count: true, _sum: { price: true } }),
  ]);
  const editing = sp.edit ? buyers.find((b) => b.id === sp.edit) : undefined;
  const showForm = !!editing || sp.new === "1";
  const stats = (name: string) => {
    const ok = sales.find((s) => s.buyer === name && s.accepted);
    return { sold: ok?._count ?? 0, revenue: ok?._sum.price ?? 0 };
  };
  const envMode = process.env.LEAD_DISTRIBUTION === "off" ? "off" : process.env.LEAD_DISTRIBUTION === "webhook" ? "the webhook in .env" : "demo mode";
  const states = list(editing?.states ?? "");
  const host = (u: string) => {
    try {
      return new URL(u).host;
    } catch {
      return u;
    }
  };

  return (
    <>
      <PageHeader
        title="Lead buyers"
        subtitle="Leads that get no online quotes can be sold here. Buyers are tried in order; the first that accepts at or above its minimum price gets the lead."
        actions={!showForm && <Link href="/admin/buyers?new=1" className={btnPrimary}>+ Add buyer</Link>}
      />
      <Notice saved={sp.saved} error={sp.error} />

      {buyers.filter((b) => b.active).length === 0 && (
        <p className="mb-6 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 text-sm text-road">
          No active buyers, so unquoted leads currently use <strong className="text-asphalt">{envMode}</strong>. Leads marked do-not-contact are never sold.
        </p>
      )}

      {showForm && (
        <div className="mb-6">
          <Card title={editing ? `Edit ${editing.name}` : "Add a buyer"}>
            <form action={saveBuyer} className="space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Buyer name" htmlFor="name"><input id="name" name="name" required maxLength={80} defaultValue={editing?.name} className={inputCls} /></FormField>
                <FormField label="Posting address (https)" htmlFor="webhookUrl" hint="From the buyer's posting spec."><input id="webhookUrl" name="webhookUrl" type="url" required defaultValue={editing?.webhookUrl} placeholder="https://" className={inputCls} /></FormField>
                <FormField
                  label="Authorization header"
                  htmlFor="authHeader"
                  hint={editing?.authHeader ? `A key ending in …${editing.authHeader.slice(-4)} is saved. Leave blank to keep it.` : "Optional, e.g. Bearer sk_live_123. Never shown again after saving."}
                >
                  <input id="authHeader" name="authHeader" type="password" autoComplete="off" className={inputCls} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Minimum price" htmlFor="minPrice" hint="Blank = any price"><input id="minPrice" name="minPrice" type="number" step="0.01" min={0} max={1000} defaultValue={editing?.minPrice ?? ""} className={inputCls} /></FormField>
                  <FormField label="Order" htmlFor="sortOrder" hint="Lower is tried first"><input id="sortOrder" name="sortOrder" type="number" min={0} max={999} required defaultValue={editing?.sortOrder ?? buyers.length} className={inputCls} /></FormField>
                </div>
              </div>
              <div>
                <Checkbox name="allStates" label="Buys leads from all states" defaultChecked={states.length === 0} hint="Untick to choose states below." />
                <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1.5 rounded-lg border border-[#EEF0F3] p-3 sm:grid-cols-6 lg:grid-cols-9">
                  {STATES.map((s) => (
                    <label key={s.code} className="flex items-center gap-2 text-sm" title={s.name}>
                      <input type="checkbox" name="states" value={s.code} defaultChecked={states.includes(s.code)} className="h-4 w-4 accent-sky" />
                      {s.code}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <Checkbox name="active" label="Active" defaultChecked={editing?.active ?? true} />
                {editing?.authHeader && <Checkbox name="clearKey" label="Remove the saved key" />}
              </div>
              <SectionFooter>
                <Link href="/admin/buyers" className={btnSecondary}>Cancel</Link>
                <button className={btnPrimary}>{editing ? "Save changes" : "Add buyer"}</button>
              </SectionFooter>
            </form>
          </Card>
        </div>
      )}

      {buyers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
              <tr>{["#", "Buyer", "States", "Minimum", "Sold (30 days)", "Status", ""].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F3]">
              {buyers.map((b) => {
                const st = list(b.states);
                const s = stats(b.name);
                return (
                  <tr key={b.id} className={b.active ? "" : "bg-[#FCFCFD] text-road"}>
                    <td className="px-4 py-3 tabular-nums text-road">{b.sortOrder}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{b.name}</span>
                      <span className="block max-w-xs truncate text-xs text-road">{host(b.webhookUrl)}</span>
                    </td>
                    <td className="px-4 py-3" title={st.join(", ")}>{st.length === 0 ? "All states" : st.length <= 4 ? st.join(", ") : `${st.length} states`}</td>
                    <td className="px-4 py-3 tabular-nums">{b.minPrice === null ? "Any" : money(b.minPrice)}</td>
                    <td className="px-4 py-3 tabular-nums">{s.sold} · {money(s.revenue)}</td>
                    <td className="px-4 py-3">
                      <form action={toggleBuyer}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{b.active ? "Active" : "Paused"}</button>
                      </form>
                    </td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-3 text-right">
                      <form action={testBuyer} className="inline">
                        <input type="hidden" name="id" value={b.id} />
                        <button className="font-semibold text-sky hover:underline">Send test lead</button>
                      </form>
                      <Link href={`/admin/buyers?edit=${b.id}`} className="font-semibold text-sky hover:underline">Edit</Link>
                      <form action={deleteBuyer} className="inline">
                        <input type="hidden" name="id" value={b.id} />
                        <button className="font-semibold text-red-600 hover:underline">Delete</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-road">Test leads are marked <code>&quot;test&quot;: true</code> and use fake details. Every sale and rejection is recorded on the lead.</p>
    </>
  );
}
