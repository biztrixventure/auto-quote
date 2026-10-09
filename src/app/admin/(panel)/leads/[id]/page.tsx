import { ProductBadge } from "@/components/admin/ProductBadge";
import { productLabel, productOf } from "@/lib/products";
import { PLANS, estimatePlans } from "@/lib/vsc-pricing";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STATUS_LABELS } from "@/components/admin/statuses";
import { describe } from "@/components/admin/activity";
import { Card, Field, StatusBadge, btnPrimary, btnSecondary, dateTime, money, timeAgo } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin-guard";
import { hasRole } from "@/lib/auth";
import { addNote, addTask, assignLead, toggleDoNotContact, toggleTask, updateStatus } from "./actions";
import { SaveButton } from "./SaveButton";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  state_minimum: "State minimum",
  standard: "Standard",
  premium: "Higher limits",
  own: "Owned",
  finance: "Financed",
  lease: "Leased",
  commute: "Commuting",
  pleasure: "Personal errands",
  business: "Business",
  valid: "Valid US license",
  permit: "Learner's permit",
  foreign: "International license",
  suspended: "Suspended or revoked",
  female: "Female",
  male: "Male",
  nonbinary: "Non-binary",
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
};
const label = (v?: string | null) => (v ? LABELS[v] ?? v : null);

function age(dob: string) {
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const [lead, users] = await Promise.all([
    db.lead.findUnique({
      where: { id },
      include: {
        drivers: true,
        vehicles: true,
        consent: true,
        quotes: { orderBy: { monthlyPremium: "asc" } },
        sales: true,
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        tasks: { orderBy: [{ doneAt: "asc" }, { dueAt: "asc" }], include: { assignee: { select: { name: true } } } },
      },
    }),
    db.adminUser.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!lead) notFound();
  const now = new Date();
  // Default due time for a new task: tomorrow 10:00 (local input format).
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const defaultDue = `${tomorrow.toISOString().slice(0, 10)}T10:00`;
  const logs = await db.auditLog.findMany({ where: { entity: "lead", entityId: id }, orderBy: { createdAt: "desc" } });
  const d = lead.drivers.find((x) => x.isPrimary) ?? lead.drivers[0];
  const v = lead.vehicles[0];
  const driverAge = d ? age(d.dateOfBirth) : null;
  const isVsc = productOf(lead.line) === "vsc";

  return (
    <>
      <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-sm font-medium text-road hover:text-asphalt">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
        All leads
      </Link>

      <div className="mt-4 flex flex-col gap-5 rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-sky/10 text-lg font-bold text-sky">
            {lead.firstName[0]}
            {lead.lastName[0]}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {lead.firstName} {lead.lastName}
              </h1>
              <StatusBadge status={lead.status} />
              <ProductBadge line={lead.line} />
              {lead.doNotContact && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">Do not contact</span>}
              {lead.doNotSell && <span title="Opted out of sale/sharing: never sent to lead buyers" className="rounded-full bg-sky px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">Do not sell</span>}
            </div>
            <p className="mt-1 text-sm text-road">
              {[lead.city, lead.state].filter(Boolean).join(", ")} {lead.zip} · Received {timeAgo(lead.createdAt)} ({dateTime(lead.createdAt)})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.consent && !lead.doNotContact ? (
            <a href={`tel:${lead.phone}`} className={btnPrimary}>
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
              Call {lead.phone}
            </a>
          ) : null}
          <a href={`mailto:${lead.email}`} className={btnSecondary}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
            Email
          </a>
        </div>
      </div>

      {lead.doNotContact && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <strong>Do not contact.</strong> This person asked not to be contacted, or matches your do-not-contact list. Don&apos;t call, text or email, and don&apos;t sell this lead.
        </div>
      )}

      {!lead.consent && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <strong>No consent record for this lead.</strong> Do not call or text until consent is confirmed.
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={`Notes (${lead.notes.length})`}>
              <form action={addNote} className="space-y-2">
                <input type="hidden" name="id" value={lead.id} />
                <label htmlFor="note" className="sr-only">New note</label>
                <textarea id="note" name="body" required maxLength={2000} rows={3} placeholder="Call outcome, what they asked, next step…" className="block w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15" />
                <button className={btnPrimary}>Add note</button>
              </form>
              {lead.notes.length > 0 && (
                <ul className="mt-5 space-y-4 border-t border-[#EEF0F3] pt-4">
                  {lead.notes.map((n) => (
                    <li key={n.id} className="text-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{n.body}</p>
                      <p className="mt-1 text-xs text-road" title={dateTime(n.createdAt)}>{n.author?.name ?? "Former user"} · {timeAgo(n.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={`Follow-ups (${lead.tasks.filter((t) => !t.doneAt).length} open)`}>
              <form action={addTask} className="grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="id" value={lead.id} />
                <label className="sr-only" htmlFor="task-title">Task</label>
                <input id="task-title" name="title" required maxLength={140} placeholder="e.g. Call back with quotes" className="h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15 sm:col-span-2" />
                <label className="sr-only" htmlFor="task-due">Due</label>
                <input id="task-due" name="dueAt" type="datetime-local" required defaultValue={defaultDue} className="h-10 rounded-lg border border-[#D0D5DD] px-3 text-sm" />
                <label className="sr-only" htmlFor="task-who">Assign to</label>
                <select id="task-who" name="assigneeId" defaultValue={me.id} className="h-10 rounded-lg border border-[#D0D5DD] bg-white px-2 text-sm">
                  {users.map((u) => <option key={u.id} value={u.id}>{u.id === me.id ? `Me (${u.name})` : u.name}</option>)}
                </select>
                <button className={`${btnPrimary} sm:col-span-2`}>Add follow-up</button>
              </form>
              {lead.tasks.length > 0 && (
                <ul className="mt-5 space-y-2 border-t border-[#EEF0F3] pt-4">
                  {lead.tasks.map((t) => {
                    const overdue = !t.doneAt && t.dueAt < now;
                    return (
                      <li key={t.id} className="flex items-start gap-3 text-sm">
                        <form action={toggleTask}>
                          <input type="hidden" name="taskId" value={t.id} />
                          <button aria-label={t.doneAt ? `Reopen ${t.title}` : `Mark ${t.title} done`} className={`mt-0.5 grid h-5 w-5 place-items-center rounded border-2 ${t.doneAt ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#D0D5DD] hover:border-sky"}`}>
                            {t.doneAt && <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>}
                          </button>
                        </form>
                        <span className={t.doneAt ? "text-road line-through" : ""}>
                          {t.title}
                          <span className={`block text-xs ${overdue ? "font-semibold text-red-600" : "text-road"}`}>
                            {overdue ? "Overdue · " : ""}Due {dateTime(t.dueAt)} · {t.assignee?.name ?? "Unassigned"}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Contact">
              <dl className="-my-2.5 divide-y divide-[#EEF0F3]">
                <Field label="Phone"><a className="text-sky hover:underline" href={`tel:${lead.phone}`}>{lead.phone}</a></Field>
                <Field label="Email"><a className="text-sky hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a></Field>
                <Field label="Address">{[lead.address, lead.city, `${lead.state} ${lead.zip}`].filter(Boolean).join(", ")}</Field>
                {!isVsc && <Field label="Insured now">{lead.currentlyInsured ? `Yes${lead.currentCarrier ? ` · ${lead.currentCarrier}` : ""}` : "No"}</Field>}
                {!isVsc && <Field label="Coverage wanted">{label(lead.coverageLevel)}</Field>}
                {isVsc && lead.coverageLevel && <Field label="Plan wanted">{PLANS.find((p) => p.key === lead.coverageLevel)?.name ?? "Not sure yet"}</Field>}
                <Field label="Product">{productLabel(lead.line)}</Field>
              </dl>
            </Card>

            <Card title={isVsc ? "Vehicle" : "Driver and vehicle"}>
              <dl className="-my-2.5 divide-y divide-[#EEF0F3]">
                {d && <Field label="Driver">{`${d.firstName} ${d.lastName}${driverAge !== null ? `, ${driverAge}` : ""}`}</Field>}
                {d && <Field label="Details">{[label(d.gender), label(d.maritalStatus), `born ${d.dateOfBirth}`].filter(Boolean).join(" · ")}</Field>}
                {d && <Field label="License">{label(d.licenseStatus)}</Field>}
                {d && (
                  <Field label="Last 3 years">
                    {`${d.accidents} at-fault accident${d.accidents === 1 ? "" : "s"} · ${d.violations} violation${d.violations === 1 ? "" : "s"}`}
                  </Field>
                )}
                {v && <Field label="Vehicle">{`${v.year} ${v.make} ${v.model}`}</Field>}
                {v && !isVsc && <Field label="Use">{`${label(v.ownership)} · ${label(v.primaryUse)} · ${v.annualMiles.toLocaleString()} mi/yr`}</Field>}
                {v?.mileage ? <Field label="Mileage">{v.mileage >= 200000 ? "150,000 or more miles" : `Up to ${v.mileage.toLocaleString()} miles`}</Field> : null}
                {isVsc && v?.factoryWarranty ? (
                  <Field label="Factory warranty">{({ yes: "Still active", no: "Ended", not_sure: "Not sure" } as Record<string, string>)[v.factoryWarranty] ?? v.factoryWarranty}</Field>
                ) : null}
                {isVsc && v && (
                  <Field label="Estimated prices (internal, not shown to the customer)">
                    {estimatePlans(v, lead.createdAt).map((p) => `${p.name}: $${p.low}-$${p.high}/mo`).join(" · ") || "None (call for a price)"}
                  </Field>
                )}
              </dl>
            </Card>
          </div>

          {!isVsc && <Card title={`Quotes (${lead.quotes.length})`}>
            {lead.quotes.length === 0 ? (
              <p className="text-sm text-road">No quotes returned for this lead.</p>
            ) : (
              <div className="-mx-5 -my-5 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
                    <tr>
                      {["Insurance company", "Monthly", "Term premium", "Source"].map((h) => (
                        <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF0F3]">
                    {lead.quotes.map((q, i) => (
                      <tr key={q.id}>
                        <td className="px-5 py-3 font-medium">
                          {q.carrier}
                          {i === 0 && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Lowest</span>}
                        </td>
                        <td className="px-5 py-3 font-semibold tabular-nums">{money(q.monthlyPremium)}</td>
                        <td className="px-5 py-3 tabular-nums text-road">{money(q.termPremium)} / {q.termMonths} mo</td>
                        <td className="px-5 py-3 text-road">{q.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Consent record">
              {lead.consent ? (
                <dl className="-my-2.5 divide-y divide-[#EEF0F3]">
                  <Field label="Agreed at">{dateTime(lead.consent.createdAt)}</Field>
                  <Field label="Version">{lead.consent.consentVersion}</Field>
                  <Field label="IP address">{lead.consent.ipAddress}</Field>
                  <Field label="Page">{lead.consent.pageUrl}</Field>
                  <Field label="TrustedForm">
                    {lead.trustedFormCertUrl ? (
                      <a href={lead.trustedFormCertUrl} target="_blank" rel="noreferrer" className="text-sky hover:underline">View certificate</a>
                    ) : null}
                  </Field>
                  <Field label="Text shown"><span className="font-normal text-road">{lead.consent.consentText}</span></Field>
                </dl>
              ) : (
                <p className="text-sm font-medium text-red-700">No consent record. Do not contact.</p>
              )}
            </Card>

            <Card title="Attribution">
              <dl className="-my-2.5 divide-y divide-[#EEF0F3]">
                <Field label="Source / medium">{[lead.utmSource, lead.utmMedium].filter(Boolean).join(" / ") || "Direct"}</Field>
                <Field label="Campaign">{lead.utmCampaign}</Field>
                <Field label="Keyword">{lead.utmTerm}</Field>
                <Field label="Google click ID">{lead.gclid}</Field>
                <Field label="Meta click ID">{lead.fbclid}</Field>
                <Field label="Landing page">{lead.landingPage}</Field>
                <Field label="Referrer">{lead.referrer}</Field>
                <Field label="Routed to">{lead.routedTo}</Field>
              </dl>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <form action={updateStatus} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <label htmlFor="status" className="sr-only">Lead status</label>
              <select id="status" name="status" defaultValue={lead.status} className="input h-11">
                {Object.entries(STATUS_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
              <SaveButton />
            </form>
            <form action={assignLead} className="mt-5 space-y-2 border-t border-[#EEF0F3] pt-4">
              <input type="hidden" name="id" value={lead.id} />
              <label htmlFor="assignedToId" className="block text-sm font-medium">Assigned to</label>
              <div className="flex gap-2">
                <select id="assignedToId" name="assignedToId" defaultValue={lead.assignedToId ?? ""} className="h-10 flex-1 rounded-lg border border-[#D0D5DD] bg-white px-2 text-sm">
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <button className={btnSecondary}>Assign</button>
              </div>
              {lead.assignedToId !== me.id && (
                <button name="assignedToId" value={me.id} className="text-sm font-semibold text-sky hover:underline">Assign to me</button>
              )}
            </form>
            {(!lead.doNotContact || hasRole(me, "admin")) && (
              <form action={toggleDoNotContact} className="mt-4 border-t border-[#EEF0F3] pt-4">
                <input type="hidden" name="id" value={lead.id} />
                <button className={`text-sm font-semibold hover:underline ${lead.doNotContact ? "text-emerald-700" : "text-red-600"}`}>
                  {lead.doNotContact ? "Remove do-not-contact" : "Mark as do not contact"}
                </button>
              </form>
            )}
          </Card>

          <Card title="Lead sales">
            {lead.sales.length === 0 ? (
              <p className="text-sm text-road">Not sent to lead buyers.</p>
            ) : (
              <ul className="-my-2 divide-y divide-[#EEF0F3] text-sm">
                {lead.sales.map((s) => (
                  <li key={s.id} className="flex justify-between gap-4 py-2.5">
                    <span>{s.distributor}{s.buyer ? ` → ${s.buyer}` : ""}</span>
                    <span className={s.accepted ? "font-semibold text-emerald-700" : "text-road"}>
                      {s.accepted ? `Accepted${s.price ? ` · ${money(s.price)}` : ""}` : "Rejected"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Activity">
            {logs.length === 0 ? (
              <p className="text-sm text-road">No activity recorded.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-[#E4E7EC] pl-5">
                {logs.map((l) => {
                  const e = describe(l.action, l.detail);
                  return (
                  <li key={l.id} className="relative text-sm">
                    <span aria-hidden className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ring-1 ${e.error ? "bg-red-500 ring-red-300" : "bg-sky ring-sky/30"}`} />
                    <p className={`font-medium ${e.error ? "text-red-700" : ""}`}>{e.text}</p>
                    <p className="mt-0.5 text-xs text-road" title={dateTime(l.createdAt)}>
                      {timeAgo(l.createdAt)} · by {l.actor}
                    </p>
                  </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
