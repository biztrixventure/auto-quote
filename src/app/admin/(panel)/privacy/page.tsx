import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { findPerson, normalizeIdentity } from "@/lib/privacy";
import { Checkbox, FormField, Notice, inputCls } from "@/components/admin/forms";
import { Card, PageHeader, StatusBadge, btnPrimary, btnSecondary, dateTime, timeAgo } from "@/components/admin/ui";
import { REQUEST_STATUS, REQUEST_TYPES, type RequestType } from "@/lib/legal";
import { addSuppression, deletePersonData, removeSuppression, updatePrivacyRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ email?: string; phone?: string; saved?: string; error?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const { email, phone } = normalizeIdentity(sp.email ?? "", sp.phone ?? "");
  const searched = !!(sp.email || sp.phone);
  const [leads, suppressions, openRequests, recentClosed] = await Promise.all([
    findPerson(email, phone),
    db.suppression.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.privacyRequest.findMany({ where: { status: { in: ["new", "in_progress"] } }, orderBy: { dueAt: "asc" }, take: 100 }),
    db.privacyRequest.findMany({ where: { status: { in: ["completed", "denied"] } }, orderBy: { updatedAt: "desc" }, take: 15 }),
  ]);
  const now = Date.now();
  const daysLeft = (d: Date) => Math.ceil((d.getTime() - now) / 86400_000);
  const exportHref = `/api/admin/privacy/export?${new URLSearchParams({ ...(email ? { email } : {}), ...(phone ? { phone } : {}) })}`;

  return (
    <>
      <PageHeader title="Privacy requests" subtitle="Find, export or delete everything you hold about a person, and manage your do-not-contact list." />
      <Notice saved={sp.saved} error={sp.error} />

      <div id="requests" className="mb-6 scroll-mt-6">
        <Card
          title={`Requests from the website (${openRequests.length} open)`}
          action={<a href="/do-not-sell" target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky hover:underline">View the form ↗</a>}
        >
          {openRequests.length === 0 ? (
            <p className="text-sm text-road">No open requests. Opt-outs from the form are applied automatically and appear under &ldquo;Recently handled&rdquo;.</p>
          ) : (
            <ul className="space-y-3">
              {openRequests.map((r) => {
                const left = daysLeft(r.dueAt);
                const findHref = `/admin/privacy?${new URLSearchParams({ email: r.email, ...(r.phone ? { phone: r.phone } : {}) })}`;
                return (
                  <li key={r.id} className="rounded-lg border border-[#EEF0F3] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm">
                        <p className="font-semibold">
                          {REQUEST_TYPES[r.type as RequestType]?.short ?? r.type}
                          <span className="ml-2 font-mono text-xs text-road">#{r.id.slice(-8).toUpperCase()}</span>
                          {r.viaAgent && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">Authorized agent</span>}
                        </p>
                        <p className="mt-1 text-road">{r.firstName} {r.lastName} · {r.email}{r.phone ? ` · ${r.phone}` : ""}{r.state ? ` · ${r.state}` : ""}</p>
                        <p className="mt-0.5 text-xs text-road">Received {dateTime(r.createdAt)} · {r.leadsFound} matching lead{r.leadsFound === 1 ? "" : "s"} at the time</p>
                        {r.details && <p className="mt-2 rounded bg-[#F9FAFB] px-3 py-2 text-road">&ldquo;{r.details}&rdquo;</p>}
                      </div>
                      <div className="text-right text-sm">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_STATUS[r.status]?.style ?? ""}`}>{REQUEST_STATUS[r.status]?.label ?? r.status}</span>
                        <p className={`mt-2 font-semibold ${left < 0 ? "text-red-700" : left <= 7 ? "text-amber-700" : "text-road"}`}>{left < 0 ? `${-left} days overdue` : `Due in ${left} day${left === 1 ? "" : "s"}`}</p>
                      </div>
                    </div>
                    <form action={updatePrivacyRequest} className="mt-3 flex flex-wrap items-end gap-2 border-t border-[#EEF0F3] pt-3">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status} aria-label="Status" className={`${inputCls} w-auto`}>
                        <option value="new">New</option>
                        <option value="in_progress">In progress (verifying)</option>
                        <option value="completed">Completed</option>
                        <option value="denied">Closed, couldn&apos;t verify</option>
                      </select>
                      <input name="note" defaultValue={r.staffNote} maxLength={1000} placeholder="Internal note, e.g. Verified by phone, data sent" aria-label="Note" className={`${inputCls} min-w-[220px] flex-1`} />
                      <button className={btnSecondary}>Save</button>
                      <Link href={findHref} className="ml-auto text-sm font-semibold text-sky hover:underline">Find their data →</Link>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
          {recentClosed.length > 0 && (
            <details className="mt-5 border-t border-[#EEF0F3] pt-4 text-sm">
              <summary className="cursor-pointer font-semibold">Recently handled ({recentClosed.length})</summary>
              <ul className="mt-3 divide-y divide-[#EEF0F3]">
                {recentClosed.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{REQUEST_TYPES[r.type as RequestType]?.short ?? r.type} · {r.firstName} {r.lastName} <span className="font-mono text-xs text-road">#{r.id.slice(-8).toUpperCase()}</span></span>
                    <span className="flex items-center gap-2 text-xs text-road">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${REQUEST_STATUS[r.status]?.style ?? ""}`}>{REQUEST_STATUS[r.status]?.label}</span>
                      {r.completedAt && timeAgo(r.completedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </div>

      <Card title="Find a person">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <FormField label="Email" htmlFor="p-email"><input id="p-email" name="email" type="email" defaultValue={sp.email} placeholder="jane@example.com" className={inputCls} /></FormField>
          <FormField label="Phone" htmlFor="p-phone"><input id="p-phone" name="phone" defaultValue={sp.phone} placeholder="(512) 555-0100" className={inputCls} /></FormField>
          <button className={btnPrimary}>Search</button>
        </form>

        {searched && (
          <div className="mt-6 border-t border-[#EEF0F3] pt-5">
            {!email && !phone ? (
              <p className="text-sm text-red-700">Enter a valid email or a 10-digit phone number.</p>
            ) : leads.length === 0 ? (
              <p className="text-sm text-road">No leads found for {[email, phone].filter(Boolean).join(" / ")}.</p>
            ) : (
              <>
                <p className="text-sm font-semibold">{leads.length} lead{leads.length === 1 ? "" : "s"} found</p>
                <ul className="mt-3 divide-y divide-[#EEF0F3] rounded-lg border border-[#EEF0F3] text-sm">
                  {leads.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span>
                        <Link href={`/admin/leads/${l.id}`} className="font-semibold text-sky hover:underline">{l.firstName} {l.lastName}</Link>
                        <span className="block text-xs text-road">{l.email} · {l.phone} · {l.city}, {l.state} · received {timeAgo(l.createdAt)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {l.doNotContact && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">DNC</span>}
                        <StatusBadge status={l.status} />
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-lg border border-[#E4E7EC] p-4">
                    <p className="font-semibold">Export their data</p>
                    <p className="mt-1 text-sm text-road">Downloads everything you hold about this person as a file you can send them.</p>
                    <a href={exportHref} className={`${btnSecondary} mt-3`}>Download their data (.json)</a>
                  </div>
                  <form action={deletePersonData} className="rounded-lg border border-red-200 bg-red-50/40 p-4">
                    <p className="font-semibold text-red-800">Delete their data</p>
                    <p className="mt-1 text-sm text-road">
                      Permanently deletes these {leads.length} lead{leads.length === 1 ? "" : "s"}, with their quotes, consent records, notes and tasks. This can&apos;t be undone.
                    </p>
                    <input type="hidden" name="email" value={email} />
                    <input type="hidden" name="phone" value={phone} />
                    <div className="mt-3 space-y-3">
                      <Checkbox name="suppress" label="Also add them to the do-not-contact list" defaultChecked />
                      <label className="block text-sm">
                        Type <strong>DELETE</strong> to confirm
                        <input name="confirm" autoComplete="off" required className={`${inputCls} mt-1.5`} />
                      </label>
                      <button className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete permanently</button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      <div className="mt-6">
        <Card title={`Do-not-contact and do-not-sell list (${suppressions.length})`}>
          <form action={addSuppression} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
            <FormField label="Email" htmlFor="s-email"><input id="s-email" name="email" type="email" className={inputCls} /></FormField>
            <FormField label="Phone" htmlFor="s-phone"><input id="s-phone" name="phone" className={inputCls} /></FormField>
            <FormField label="Type" htmlFor="s-type">
              <select id="s-type" name="type" defaultValue="dnc" className={inputCls}>
                <option value="dnc">Do not contact</option>
                <option value="do_not_sell">Do not sell or share</option>
              </select>
            </FormField>
            <FormField label="Reason" htmlFor="s-reason"><input id="s-reason" name="reason" maxLength={120} placeholder="e.g. Asked on the phone" className={inputCls} /></FormField>
            <button className={btnPrimary}>Add</button>
          </form>
          <p className="mt-2 text-xs text-road">New quote requests from these people are still saved but flagged “Do not contact”, and they aren&apos;t sold to lead buyers.</p>
          {suppressions.length > 0 && (
            <div className="-mx-5 -mb-5 mt-5 overflow-x-auto border-t border-[#EEF0F3]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
                  <tr>{["Email", "Phone", "Type", "Reason", "Added", ""].map((h) => <th key={h} scope="col" className="px-5 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#EEF0F3]">
                  {suppressions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-2.5">{s.email ?? "—"}</td>
                      <td className="px-5 py-2.5">{s.phone ?? "—"}</td>
                      <td className="px-5 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.type === "do_not_sell" ? "bg-sky/10 text-sky" : "bg-red-50 text-red-700"}`}>{s.type === "do_not_sell" ? "Do not sell" : "Do not contact"}</span>
                      </td>
                      <td className="px-5 py-2.5 text-road">{s.reason ?? "—"}</td>
                      <td className="px-5 py-2.5 text-road" title={dateTime(s.createdAt)}>{timeAgo(s.createdAt)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <form action={removeSuppression}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="text-sm font-semibold text-sky hover:underline">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
