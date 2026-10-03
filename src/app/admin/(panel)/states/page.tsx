import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { ensureStateGuides, guidePath, limitsShort } from "@/lib/state-guides";
import { Notice } from "@/components/admin/forms";
import { PageHeader, btnPrimary, btnSecondary } from "@/components/admin/ui";
import { STATE_RESEARCH } from "@/lib/state-guide-research";
import { fillFromResearch, publishAllChecked, setStatePublished } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "State guides" };

export default async function StatesAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; show?: string }> }) {
  await requireAdmin("admin");
  await ensureStateGuides();
  const sp = await searchParams;
  const all = await db.stateGuide.findMany({ orderBy: { name: "asc" } });
  const counts = {
    published: all.filter((g) => g.published).length,
    checked: all.filter((g) => g.verifiedAt && !g.published).length,
    todo: all.filter((g) => !g.verifiedAt).length,
  };
  const show = sp.show ?? "all";
  const rows = all.filter((g) => (show === "published" ? g.published : show === "checked" ? g.verifiedAt && !g.published : show === "todo" ? !g.verifiedAt : true));

  return (
    <>
      <PageHeader
        title="State guides"
        subtitle="One car insurance guide per state at /car-insurance/<state>. Check each state's facts against the official source before publishing."
        actions={
          <>
            <a href="/car-insurance" target="_blank" rel="noreferrer" className={btnSecondary}>View on site ↗</a>
            <form action={fillFromResearch}>
              <button className={btnSecondary} disabled={counts.todo === 0} title="Fills unchecked states only; checked states are never changed">Fill in researched data</button>
            </form>
            <form action={publishAllChecked}>
              <button className={btnPrimary} disabled={counts.checked === 0}>Publish all checked ({counts.checked})</button>
            </form>
          </>
        }
      />
      <Notice saved={sp.saved} error={sp.error} />

      <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <nav className="flex flex-wrap gap-1 border-b border-[#EEF0F3] p-4 text-sm">
          {([["all", "All", all.length], ["published", "Published", counts.published], ["checked", "Checked, not published", counts.checked], ["todo", "Needs checking", counts.todo]] as const).map(([v, l, n]) => (
            <Link key={v} href={v === "all" ? "/admin/states" : `/admin/states?show=${v}`} className={`rounded-lg px-3 py-1.5 font-semibold ${show === v ? "bg-asphalt text-white" : "text-road hover:bg-[#F2F4F7]"}`}>
              {l} <span className="ml-0.5 tabular-nums opacity-70">{n}</span>
            </Link>
          ))}
        </nav>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
              <tr>{["State", "Minimum", "Fault", "Research", "Facts checked", "Status", ""].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F3]">
              {rows.map((g) => (
                <tr key={g.code} className="hover:bg-[#FCFCFD]">
                  <td className="px-4 py-3"><Link href={`/admin/states/${g.code.toLowerCase()}`} className="font-semibold text-asphalt hover:text-sky">{g.name}</Link></td>
                  <td className="px-4 py-3 tabular-nums">{limitsShort(g) || <span className="text-road">—</span>}{g.pipRequired && <span className="ml-1 text-xs text-road">+PIP</span>}</td>
                  <td className="px-4 py-3 text-road">{g.noFault ? "No-fault" : "At-fault"}{g.insuranceOptional && <span className="ml-1 text-xs">(optional)</span>}</td>
                  <td className="px-4 py-3 text-xs">
                    {STATE_RESEARCH[g.code] && (
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${STATE_RESEARCH[g.code].confidence === "high" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`} title={STATE_RESEARCH[g.code].caveat ?? ""}>
                        {STATE_RESEARCH[g.code].confidence}{STATE_RESEARCH[g.code].caveat ? " ⚠" : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{g.verifiedAt ? g.verifiedAt.toLocaleDateString("en-US", { dateStyle: "medium" }) : <span className="font-semibold text-amber-700">Not yet</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${g.published ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F4F7] text-road"}`}>{g.published ? "Published" : "Draft"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-3">
                      {g.published && <a href={guidePath(g)} target="_blank" rel="noreferrer" className="font-semibold text-sky hover:underline">View ↗</a>}
                      <form action={setStatePublished}>
                        <input type="hidden" name="code" value={g.code} />
                        <input type="hidden" name="publish" value={g.published ? "0" : "1"} />
                        <button className="font-semibold text-asphalt hover:text-sky disabled:opacity-40" disabled={!g.published && !g.verifiedAt} title={!g.published && !g.verifiedAt ? "Check the facts first" : undefined}>
                          {g.published ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
