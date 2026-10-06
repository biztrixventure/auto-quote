"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VSC_DISCLOSURE } from "@/lib/products";
import { STATES, stateFromZip } from "@/lib/states";
import { VSC_MILEAGE, vscFormSchema, type VscFormValues } from "@/lib/validation";
import { POPULAR_MAKES, vehicleYears } from "@/lib/vehicles";
import { readTracking } from "./TrackingCapture";
import { TrustedForm } from "./TrustedForm";

// Vehicle service contract quote request. One short page: the car, its mileage and how to reach
// the person. A team member calls back with plan options; nothing here mentions insurance.

type Props = { consentText: string; consentVersion: string; phone: string; phoneHref: string };

const MILEAGE_LABEL = (m: string, i: number) => {
  const n = Number(m);
  const prev = i === 0 ? 0 : Number(VSC_MILEAGE[i - 1]);
  return i === VSC_MILEAGE.length - 1 ? `${(prev / 1000).toFixed(0)}k or more miles` : `${prev ? `${(prev / 1000).toFixed(0)}k–` : "Under "}${(n / 1000).toFixed(0)}k miles`;
};

export function VscQuoteForm({ consentText, consentVersion, phone, phoneHref }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VscFormValues>({ resolver: zodResolver(vscFormSchema), mode: "onTouched" });

  const zip = watch("zip");
  useEffect(() => {
    const s = stateFromZip(zip ?? "");
    if (s) setValue("state", s, { shouldValidate: true });
  }, [zip, setValue]);

  // Load models from NHTSA when year + make are chosen.
  const year = watch("vehicleYear");
  const make = watch("vehicleMake");
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => {
    if (!year || !make) return;
    let cancelled = false;
    fetch(`/api/vehicles?type=models&year=${year}&make=${encodeURIComponent(make)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setModels(d.items ?? []))
      .catch(() => !cancelled && setModels([]));
    return () => {
      cancelled = true;
    };
  }, [year, make]);

  async function onSubmit(form: VscFormValues) {
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/vsc-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form,
          tracking: readTracking(),
          trustedFormCertUrl: formRef.current?.querySelector<HTMLInputElement>('input[name="xxTrustedFormCertUrl"]')?.value ?? "",
          website: formRef.current?.querySelector<HTMLInputElement>('input[name="website"]')?.value ?? "",
          pageUrl: window.location.href,
          consentVersion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; dataLayer?: unknown[] };
      w.gtag?.("event", "generate_lead", { currency: "USD", value: 0, product: "vehicle_service_contract" });
      w.fbq?.("track", "Lead", { content_category: "vehicle_service_contract" });
      w.dataLayer?.push({ event: "vsc_quote_submitted" });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setServerError(err instanceof Error ? `${err.message}. Check your answers and try again.` : "We couldn't send your answers. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const err = (k: keyof VscFormValues) => (errors[k] ? <p id={`${k}-error`} className="error">{errors[k]?.message as string}</p> : null);
  // All fields are required; the consent box also points to its wording.
  const aria = (k: keyof VscFormValues) => ({
    id: k,
    "aria-invalid": !!errors[k],
    "aria-required": true,
    "aria-describedby": [errors[k] && `${k}-error`, k === "consent" && "consent-text"].filter(Boolean).join(" ") || undefined,
  });

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rail bg-white px-6 py-14 text-center shadow-[0_20px_50px_-20px_rgba(38,42,48,0.18)]" role="status">
        <span aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
        </span>
        <h1 className="mt-6 text-2xl font-bold">Thanks, we&apos;ve got your details</h1>
        <p className="mt-3 leading-relaxed text-road">
          A member of our team will call you shortly with vehicle service contract options and prices for your car. Want to talk now? Call{" "}
          <a href={phoneHref} className="font-semibold text-sky hover:underline">{phone}</a>.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
      <TrustedForm />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="rounded-2xl border border-rail bg-white px-6 py-8 shadow-[0_20px_50px_-24px_rgba(38,42,48,0.2)] sm:px-10 sm:py-10">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">Vehicle service contract</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-[1.9rem]">Get a quote to help with repair bills</h1>
        <p className="mt-2 max-w-xl leading-relaxed text-road">Tell us about your car. We&apos;ll contact you with plan options and prices. Free, with no obligation.</p>

        <fieldset className="mt-8">
          <legend className="text-lg font-bold">Your car</legend>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="vehicleYear">Year</label>
              <select className="input" {...aria("vehicleYear")} {...register("vehicleYear", { onChange: () => setValue("vehicleModel", "") })}>
                <option value="">Choose year</option>
                {vehicleYears().map((y) => <option key={y}>{y}</option>)}
              </select>
              {err("vehicleYear")}
            </div>
            <div>
              <label className="label" htmlFor="vehicleMake">Make</label>
              <select className="input" {...aria("vehicleMake")} {...register("vehicleMake", { onChange: () => setValue("vehicleModel", "") })}>
                <option value="">Choose make</option>
                {POPULAR_MAKES.map((m) => <option key={m}>{m}</option>)}
              </select>
              {err("vehicleMake")}
            </div>
            <div>
              <label className="label" htmlFor="vehicleModel">Model</label>
              {models.length ? (
                <select className="input" {...aria("vehicleModel")} {...register("vehicleModel")}>
                  <option value="">Choose model</option>
                  {models.map((m) => <option key={m}>{m}</option>)}
                </select>
              ) : (
                <input className="input" placeholder="e.g. Camry" {...aria("vehicleModel")} {...register("vehicleModel")} />
              )}
              {err("vehicleModel")}
            </div>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="mileage">Current mileage</label>
              <select className="input" {...aria("mileage")} {...register("mileage")}>
                <option value="">Choose mileage</option>
                {VSC_MILEAGE.map((m, i) => <option key={m} value={m}>{MILEAGE_LABEL(m, i)}</option>)}
              </select>
              {err("mileage")}
            </div>
            <div>
              <label className="label" htmlFor="zip">ZIP code</label>
              <input className="input" inputMode="numeric" maxLength={5} autoComplete="postal-code" placeholder="e.g. 90210" {...aria("zip")} {...register("zip")} />
              {err("zip")}
            </div>
            <div>
              <label className="label" htmlFor="state">State</label>
              <select className="input" {...aria("state")} {...register("state")}>
                <option value="">Choose a state</option>
                {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              {err("state")}
            </div>
          </div>
        </fieldset>

        <fieldset className="mt-10">
          <legend className="text-lg font-bold">How can we reach you?</legend>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="firstName">First name</label>
              <input className="input" autoComplete="given-name" {...aria("firstName")} {...register("firstName")} />
              {err("firstName")}
            </div>
            <div>
              <label className="label" htmlFor="lastName">Last name</label>
              <input className="input" autoComplete="family-name" {...aria("lastName")} {...register("lastName")} />
              {err("lastName")}
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input type="email" className="input" autoComplete="email" placeholder="you@example.com" {...aria("email")} {...register("email")} />
              {err("email")}
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input type="tel" className="input" autoComplete="tel-national" placeholder="(555) 555-5555" {...aria("phone")} {...register("phone")} />
              {err("phone")}
            </div>
          </div>
          <div className="mt-6">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-rail bg-white p-4 text-sm leading-relaxed text-road transition hover:border-road/40 has-[:checked]:border-sky has-[:checked]:bg-sky/[0.04]">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-sky" {...aria("consent")} {...register("consent")} />
              <span id="consent-text">{consentText}</span>
            </label>
            {err("consent")}
          </div>
        </fieldset>

        {serverError && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{serverError}</p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary mt-8 w-full bg-line text-asphalt hover:bg-[#E3B21F] disabled:opacity-60 sm:w-auto sm:min-w-52">
          {submitting ? "Sending…" : "Get my quote"}
        </button>
        <p className="mt-6 text-xs leading-relaxed text-road">{VSC_DISCLOSURE}</p>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <div className="rounded-2xl bg-[linear-gradient(135deg,#0B2F5B_0%,#1F5FAD_100%)] p-6 text-white">
          <p className="text-lg font-bold">Prefer to talk to someone?</p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/80">Our team can explain plan options and prices by phone.</p>
          <a href={phoneHref} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-asphalt transition hover:bg-white/90">{phone}</a>
        </div>
        <ul className="space-y-3 rounded-2xl border border-rail bg-white p-6 text-sm text-road">
          {["Free quote, no obligation", "Real people to help you", "Several plan levels to choose from"].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky/10 text-sky">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
        <p className="px-1 text-xs leading-relaxed text-road">
          Looking for car insurance instead? <a href="/quote/auto" className="font-semibold text-sky hover:underline">Compare car insurance quotes</a>.
        </p>
      </aside>
    </form>
  );
}
