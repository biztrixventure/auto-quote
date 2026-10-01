import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { db } from "@/lib/db";
import { list } from "@/lib/pricing";
import { Notice } from "@/components/admin/forms";
import { Card, PageHeader, btnPrimary } from "@/components/admin/ui";
import { togglePartner } from "./actions";

export const dynamic = "force-dynamic";

const COVERAGE_SHORT: Record<string, string> = { state_minimum: "Min", standard: "Std", premium: "High" };

function rules(p: { minAge: number | null; maxAge: number | null; maxAccidents: number | null; maxViolations: number | null; acceptsUninsured: boolean }) {
  const out: string[] = [];
  if (p.minAge !== null || p.maxAge !== null) out.push(`Age ${p.minAge ?? 16}–${p.maxAge ?? "any"}`);
  if (p.maxAccidents !== null) out.push(`≤${p.maxAccidents} accidents`);
  if (p.maxViolations !== null) out.push(`≤${p.maxViolations} tickets`);
  if (!p.acceptsUninsured) out.push("Must be insured now");
  return out.length ? out.join(" · ") : "Any driver";
}

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin("admin");
  const [{ saved, error }, partners] = await Promise.all([searchParams, db.partner.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })]);
  const active = partners.filter((p) => p.active).length;

  return (
    <>
      <PageHeader
        title="Partners"
        subtitle={`${active} of ${partners.length} shown in quote results. Visitors only see partners that match their state, coverage and driving record.`}
        actions={<Link href="/admin/partners/new" className={btnPrimary}>+ Add partner</Link>}
      />
      <Notice saved={saved} error={error} />

      {partners.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <p className="font-semibold">No partners yet</p>
            <p className="mt-1 text-sm text-road">Without active partners, visitors get no online prices and leads go to lead buyers or an agent.</p>
            <Link href="/admin/partners/new" className={`${btnPrimary} mt-5`}>Add your first partner</Link>
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
              <tr>
                {["Partner", "States", "Coverage", "Accepts", "Price factor", "Status", ""].map((h, i) => (
                  <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F3]">
              {partners.map((p) => {
                const states = list(p.states);
                return (
                  <tr key={p.id} className={p.active ? "" : "bg-[#FCFCFD] text-road"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.logoUrl ? (
                          <img src={p.logoUrl} alt="" className="h-9 w-14 shrink-0 rounded border border-[#EEF0F3] bg-white object-contain p-1" />
                        ) : (
                          <span aria-hidden className="grid h-9 w-14 shrink-0 place-items-center rounded border border-[#EEF0F3] bg-[#F9FAFB] text-xs font-bold text-road">
                            {p.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <Link href={`/admin/partners/${p.id}`} className="font-semibold text-asphalt hover:text-sky">{p.name}</Link>
                          {p.tagline && <span className="block text-xs text-road">{p.tagline}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" title={states.join(", ")}>
                      {states.length === 0 ? "All states" : states.length <= 4 ? states.join(", ") : `${states.length} states`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{list(p.coverageLevels).map((c) => COVERAGE_SHORT[c] ?? c).join(" · ")}</td>
                    <td className="px-4 py-3 text-xs">{rules(p)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      ×{p.priceFactor.toFixed(2)}
                      <span className="ml-1.5 text-xs font-normal text-road">
                        {p.priceFactor === 1 ? "base" : `${p.priceFactor < 1 ? "" : "+"}${Math.round((p.priceFactor - 1) * 100)}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <form action={togglePartner}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          aria-label={`${p.active ? "Hide" : "Show"} ${p.name}`}
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            p.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {p.active ? "Active" : "Hidden"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/partners/${p.id}`} className="font-semibold text-sky hover:underline">Edit</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-road">
        Click a status to show or hide a partner. Prices come from the{" "}
        <Link href="/admin/pricing" className="font-semibold text-sky hover:underline">Pricing</Link> page multiplied by each partner&apos;s price factor.
      </p>
    </>
  );
}
