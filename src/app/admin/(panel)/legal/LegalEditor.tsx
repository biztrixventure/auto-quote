"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LegalSettings } from "@/lib/settings";
import { RichEditor } from "../blog/RichEditor";
import { saveLegal } from "./actions";

const input = "block h-10 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-road/45 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15";
const TOKENS = ["{company}", "{legal_name}", "{email}", "{phone}", "{privacy_email}", "{privacy_phone}", "{address}", "{governing_state}", "{site_url}", "{response_days}"];

function Card({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-road">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function LegalEditor({ initial, templates, defaults }: { initial: LegalSettings; templates: { privacy: string; terms: string }; defaults: { email: string; phone: string } }) {
  const [s, setS] = useState(initial);
  const [tab, setTab] = useState<"privacy" | "terms" | "settings">("privacy");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [reset, setReset] = useState({ privacy: { token: 0, html: "" }, terms: { token: 0, html: "" } });
  const set = <K extends keyof LegalSettings>(k: K, v: LegalSettings[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const r = await saveLegal(s);
      if (!r.ok || !r.legal) return setNotice({ ok: false, text: r.error ?? "Couldn't save." });
      setS(r.legal);
      setDirty(false);
      setNotice({ ok: true, text: "Saved. Your legal pages are updated on the website." });
    } catch {
      setNotice({ ok: false, text: "Couldn't save. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  function restore(doc: "privacy" | "terms") {
    if (!window.confirm(`Replace the ${doc === "privacy" ? "Privacy Policy" : "Terms of Use"} with the original template? Your edits to it will be lost when you save.`)) return;
    const html = templates[doc];
    set(doc === "privacy" ? "privacyHtml" : "termsHtml", html);
    setReset((r) => ({ ...r, [doc]: { token: r[doc].token + 1, html } }));
  }

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-[#E4E7EC] bg-[#F6F7F9]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <nav className="flex gap-1 rounded-lg bg-white p-1 text-sm font-semibold shadow-sm">
          {([["privacy", "Privacy Policy"], ["terms", "Terms of Use"], ["settings", "Privacy settings"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 ${tab === k ? "bg-asphalt text-white" : "text-road hover:text-asphalt"}`}>{l}</button>
          ))}
        </nav>
        <span className="text-xs text-road">{saving ? "Saving…" : dirty ? "Unsaved changes" : ""}</span>
        <div className="ml-auto flex gap-2">
          <a href={tab === "terms" ? "/terms" : tab === "settings" ? "/do-not-sell" : "/privacy"} target="_blank" rel="noreferrer" className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">View page ↗</a>
          <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="rounded-lg bg-asphalt px-4 py-2 text-sm font-semibold text-white hover:bg-road disabled:opacity-50">Save</button>
        </div>
      </div>

      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice.text}</div>
      )}
      {!s.reviewed && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Have an attorney review these documents.</strong> They are a solid starting template for a car insurance and warranty lead website, but the law depends on your licenses, states and partners. When your attorney approves them, tick &ldquo;Reviewed by our attorney&rdquo; in Privacy settings.
        </div>
      )}

      {(["privacy", "terms"] as const).map((doc) => (
        <div key={doc} className={tab === doc ? "grid gap-6 xl:grid-cols-[1fr_300px]" : "hidden"}>
          <div className="min-w-0">
            <RichEditor initialHtml={doc === "privacy" ? initial.privacyHtml : initial.termsHtml} reset={reset[doc]} onChange={(html) => set(doc === "privacy" ? "privacyHtml" : "termsHtml", html)} />
          </div>
          <aside className="space-y-4">
            <Card title="Last updated">
              <p className="text-sm text-road">{doc === "privacy" ? s.privacyUpdated : s.termsUpdated}. Changes automatically when you save new wording.</p>
            </Card>
            <Card title="Fill-in words" hint="Type these anywhere; the website replaces them with your details.">
              <ul className="flex flex-wrap gap-1.5">
                {TOKENS.map((t) => <li key={t}><code className="rounded bg-[#F2F4F7] px-1.5 py-0.5 text-xs">{t}</code></li>)}
              </ul>
            </Card>
            <Card title="Template">
              <p className="text-sm text-road">Start again from the original template written for this website.</p>
              <button type="button" onClick={() => restore(doc)} className="rounded-lg border border-[#D0D5DD] px-3 py-1.5 text-sm font-semibold hover:bg-[#F9FAFB]">Restore template</button>
            </Card>
          </aside>
        </div>
      ))}

      <div className={tab === "settings" ? "grid gap-6 lg:grid-cols-2" : "hidden"}>
        <Card title="Privacy contact" hint="Shown in the Privacy Policy and on the opt-out page. Leave blank to use your business details.">
          <label className="block text-sm font-medium">Privacy email<input value={s.privacyEmail} onChange={(e) => set("privacyEmail", e.target.value)} placeholder={defaults.email} className={`${input} mt-1.5`} /></label>
          <label className="block text-sm font-medium">Privacy phone (toll-free recommended)<input value={s.privacyPhone} onChange={(e) => set("privacyPhone", e.target.value)} placeholder={defaults.phone} className={`${input} mt-1.5`} /></label>
          <label className="block text-sm font-medium">Mailing address<input value={s.mailingAddress} onChange={(e) => set("mailingAddress", e.target.value)} placeholder="123 Main St, Austin, TX 78701" className={`${input} mt-1.5`} /></label>
          <label className="block text-sm font-medium">State whose laws govern your terms<input value={s.governingState} onChange={(e) => set("governingState", e.target.value)} placeholder="Texas" className={`${input} mt-1.5`} /></label>
        </Card>

        <Card title="Opt-out and requests">
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={s.honorGpc} onChange={(e) => set("honorGpc", e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky" />
            <span><span className="font-medium">Honor Global Privacy Control (GPC)</span><span className="block text-xs text-road">Required in California and several other states. Browsers that send this signal are treated as opted out of sale and sharing. Keep this on.</span></span>
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={s.confirmByEmail} onChange={(e) => set("confirmByEmail", e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky" />
            <span><span className="font-medium">Email people a confirmation of their request</span><span className="block text-xs text-road">Needs email alerts set up (RESEND_API_KEY).</span></span>
          </label>
          <label className="block text-sm font-medium">
            Days to answer access, delete and correct requests
            <input type="number" min={10} max={90} value={s.responseDays} onChange={(e) => set("responseDays", Number(e.target.value))} className={`${input} mt-1.5 max-w-[120px]`} />
            <span className="mt-1 block text-xs font-normal text-road">California allows 45 days. Opt-outs are always applied immediately.</span>
          </label>
          <label className="flex items-start gap-2.5 rounded-lg bg-[#F9FAFB] p-3 text-sm">
            <input type="checkbox" checked={s.reviewed} onChange={(e) => set("reviewed", e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky" />
            <span><span className="font-medium">Reviewed by our attorney</span><span className="block text-xs text-road">Tick when a lawyer has approved the current Privacy Policy and Terms. Changing the wording unticks it.</span></span>
          </label>
        </Card>
      </div>
    </div>
  );
}
