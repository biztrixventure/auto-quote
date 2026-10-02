"use client";

import { useEffect, useState } from "react";
import { STATES } from "@/lib/states";

type TypeKey = "opt_out_sale" | "opt_out_contact" | "access" | "delete" | "correct";
const TYPES: { key: TypeKey; title: string; body: string }[] = [
  { key: "opt_out_sale", title: "Do not sell or share my information", body: "We stop selling or sharing your details with marketing partners and turn off ad tracking. Takes effect right away." },
  { key: "opt_out_contact", title: "Stop calls, texts and emails", body: "We add you to our do-not-contact list and tell our partners." },
  { key: "access", title: "Send me a copy of my information", body: "We'll confirm it's you and send what we hold." },
  { key: "delete", title: "Delete my information", body: "We'll confirm it's you and delete it, except what the law requires us to keep." },
  { key: "correct", title: "Correct my information", body: "Tell us what's wrong and we'll fix it." },
];

declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

export function PrivacyRequestForm({ initialType = "opt_out_sale", phone }: { initialType?: string; phone: string }) {
  const [type, setType] = useState<TypeKey>((TYPES.find((t) => t.key === initialType)?.key ?? "opt_out_sale") as TypeKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);
  const [gpc, setGpc] = useState(false);
  useEffect(() => setGpc(navigator.globalPrivacyControl === true), []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/privacy-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          firstName: f.get("firstName"),
          lastName: f.get("lastName"),
          email: f.get("email"),
          phone: f.get("phone"),
          state: f.get("state"),
          details: f.get("details") ?? "",
          viaAgent: f.get("viaAgent") === "on",
          confirm: f.get("confirm") === "on",
          website: f.get("website") ?? "",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { reference?: string; message?: string; error?: string };
      if (!res.ok || !json.reference) throw new Error(json.error || "Something went wrong. Please try again.");
      setDone({ reference: json.reference, message: json.message ?? "" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-3xl bg-[linear-gradient(155deg,#E9F7EF_0%,#FFFFFF_60%)] p-8 text-center">
        <span aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
        </span>
        <h2 className="mt-5 text-2xl font-extrabold text-asphalt">Request received</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-road">{done.message}</p>
        <p className="mt-5 text-sm text-road">
          Reference number: <strong className="font-mono text-asphalt">{done.reference}</strong>
        </p>
        <p className="mt-1 text-sm text-road">Questions? Call {phone}.</p>
      </div>
    );
  }

  const needsDetails = type === "correct";
  return (
    <form onSubmit={submit} className="space-y-6" noValidate={false}>
      {gpc && (
        <p className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span aria-hidden className="mt-0.5 font-bold">✓</span>
          <span><strong>Global Privacy Control is on in your browser.</strong> We already treat this browser as opted out of the sale and sharing of your information. Submit the form too if you want the opt-out applied to your email and phone everywhere.</span>
        </p>
      )}

      <fieldset>
        <legend className="label">What would you like us to do?</legend>
        <div className="grid gap-3">
          {TYPES.map((t) => (
            <label key={t.key} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition ${type === t.key ? "bg-[#EEF4FC] ring-2 ring-sky" : "bg-[#F7F9FC] hover:bg-[#F1F4F8]"}`}>
              <input type="radio" name="type" value={t.key} checked={type === t.key} onChange={() => setType(t.key)} className="mt-1 h-4 w-4 accent-sky" />
              <span>
                <span className="block font-semibold text-asphalt">{t.title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-road">{t.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="pr-first" className="label">First name</label><input id="pr-first" name="firstName" required maxLength={60} autoComplete="given-name" className="input" /></div>
        <div><label htmlFor="pr-last" className="label">Last name</label><input id="pr-last" name="lastName" required maxLength={60} autoComplete="family-name" className="input" /></div>
        <div><label htmlFor="pr-email" className="label">Email</label><input id="pr-email" name="email" type="email" required maxLength={200} autoComplete="email" className="input" /></div>
        <div><label htmlFor="pr-phone" className="label">Phone <span className="font-normal text-road">(recommended)</span></label><input id="pr-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className="input" /></div>
        <div className="sm:col-span-2">
          <label htmlFor="pr-state" className="label">State you live in</label>
          <select id="pr-state" name="state" defaultValue="" className="input">
            <option value="">Choose your state</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        {(needsDetails || type === "access" || type === "delete") && (
          <div className="sm:col-span-2">
            <label htmlFor="pr-details" className="label">{needsDetails ? "What should we correct?" : "Anything that helps us find your information (optional)"}</label>
            <textarea id="pr-details" name="details" required={needsDetails} maxLength={1000} rows={3} className="input h-auto py-3" />
          </div>
        )}
      </div>
      <p className="hint">Use the same email and phone number you gave us, so we can find your information.</p>

      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-3"><input type="checkbox" name="viaAgent" className="mt-0.5 h-4 w-4 accent-sky" /><span className="text-road">I&apos;m an authorized agent making this request for someone else. We may ask for proof.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="confirm" required className="mt-0.5 h-4 w-4 accent-sky" /><span className="text-road">I confirm this information is mine, or I&apos;m authorized to act for the person it belongs to.</span></label>
      </div>

      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={busy} className="btn-primary w-full bg-asphalt sm:w-auto">{busy ? "Sending…" : "Submit request"}</button>
    </form>
  );
}
