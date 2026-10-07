"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VSC_DISCLOSURE } from "@/lib/products";
import { STATES, stateFromZip } from "@/lib/states";
import { VSC_MILEAGE, VSC_STEP_FIELDS, vscFormSchema, type VscFormValues, type VscStepKey } from "@/lib/validation";
import { POPULAR_MAKES, vehicleYears } from "@/lib/vehicles";
import { readTracking } from "./TrackingCapture";
import { TrustedForm } from "./TrustedForm";

// Vehicle service contract quote, one short step at a time: the car, its mileage and location,
// the kind of plan, then contact details. The results page shows estimated plan prices.

const STEPS: { key: VscStepKey; label: string; title: string; subtitle: string }[] = [
  { key: "car", label: "Your car", title: "What car do you drive?", subtitle: "Your car's year, make and model decide which plans it qualifies for." },
  { key: "details", label: "Mileage", title: "How many miles are on it?", subtitle: "Mileage changes which plans you can get and what they cost. Plans and prices also vary by state." },
  { key: "plan", label: "Plan", title: "What do you want to protect?", subtitle: "Pick the level that sounds right. You'll see prices for every plan your car qualifies for." },
  { key: "contact", label: "Contact", title: "Where should we send your prices?", subtitle: "Your estimated prices show on the next page, and a member of our team may call to help you choose." },
];

const PLAN_CHOICES: [string, string, string][] = [
  ["powertrain", "Powertrain", "Engine, transmission and drive parts, the most expensive repairs"],
  ["plus", "Powertrain Plus", "Adds air conditioning, brakes, steering and electrical"],
  ["complete", "Complete", "Most mechanical and electrical parts, similar to a factory warranty"],
  ["not_sure", "Not sure yet", "Show me all the plans my car qualifies for"],
];

const DRAFT_KEY = "vsc_draft";

const MILEAGE_LABEL = (m: string, i: number) => {
  const n = Number(m) / 1000;
  const prev = i === 0 ? 0 : Number(VSC_MILEAGE[i - 1]) / 1000;
  if (i === VSC_MILEAGE.length - 1) return `${prev},000+ miles`;
  return prev ? `${prev},000–${n},000` : `Under ${n},000`;
};

// Anonymous drop-off tracking for the admin Reports page: a random per-tab ID and a step number.
function trackStep(step: number) {
  try {
    let sid = sessionStorage.getItem("aq_funnel");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("aq_funnel", sid);
    }
    const body = new Blob([JSON.stringify({ sid, step })], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/funnel", body)) fetch("/api/funnel", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Tracking must never get in the way of the form.
  }
}

type Props = { initialZip?: string; consentText: string; consentVersion: string; phone: string; phoneHref: string };

export function VscQuoteForm({ initialZip = "", consentText, consentVersion, phone, phoneHref }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<VscFormValues>({
    resolver: zodResolver(vscFormSchema),
    mode: "onTouched",
    defaultValues: { zip: initialZip, state: stateFromZip(initialZip) ?? "" } as Partial<VscFormValues>,
  });

  // Restore an unfinished form (never restores consent).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved?.values) {
        reset({ ...saved.values, consent: undefined, ...(initialZip ? { zip: initialZip, state: stateFromZip(initialZip) ?? saved.values.state } : {}) });
        if (typeof saved.step === "number") setStep(Math.min(saved.step, STEPS.length - 1));
      }
    } catch {}
  }, [initialZip, reset]);

  const values = watch();
  useEffect(() => {
    try {
      const { consent: _c, ...rest } = values;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: rest, step }));
    } catch {}
  }, [values, step]);

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

  useEffect(() => trackStep(step), [step]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function next() {
    const ok = await trigger(VSC_STEP_FIELDS[current.key] as unknown as (keyof VscFormValues)[], { shouldFocus: true });
    if (ok) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

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
      localStorage.removeItem(DRAFT_KEY);
      trackStep(STEPS.length);
      const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; dataLayer?: unknown[] };
      w.gtag?.("event", "generate_lead", { currency: "USD", value: 0, product: "vehicle_service_contract" });
      w.fbq?.("track", "Lead", { content_category: "vehicle_service_contract" });
      w.dataLayer?.push({ event: "vsc_quote_submitted" });
      router.push(`/quote/results/${data.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? `${err.message}. Check your answers and try again.` : "We couldn't send your answers. Try again.");
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

  if (submitting) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rail bg-white px-6 py-16 text-center shadow-[0_20px_50px_-20px_rgba(38,42,48,0.18)]" role="status" aria-live="polite">
        <span aria-hidden className="mx-auto block h-14 w-14 animate-spin rounded-full border-4 border-sky/15 border-t-sky" />
        <h2 className="mt-8 text-2xl font-bold">Finding plans for your car</h2>
        <p className="mt-2 text-road">This usually takes a few seconds. Please don&apos;t close this page.</p>
      </div>
    );
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
      <TrustedForm />
      {/* Bot trap: hidden from people and screen readers, so only bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-rail bg-white shadow-[0_20px_50px_-24px_rgba(38,42,48,0.2)]">
        <div className="border-b border-rail px-6 pb-5 pt-6 sm:px-10">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-sky">
              Step {step + 1} of {STEPS.length}
              <span className="font-medium text-road"> · {current.label}</span>
            </span>
            <span className="font-medium text-road">{progress}% complete</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EDF0F3]" role="progressbar" aria-label="Quote progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-gradient-to-r from-sky to-[#3D8FDB] transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div key={step} className="step-in px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-[1.9rem]">{current.title}</h1>
          <p className="mt-2 max-w-xl leading-relaxed text-road">{current.subtitle}</p>

          <div className="mt-8 space-y-6">
            {current.key === "car" && (
              <div className="grid gap-6 sm:grid-cols-3">
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
            )}

            {current.key === "details" && (
              <>
                <fieldset aria-describedby={errors.mileage ? "mileage-error" : undefined}>
                  <legend className="label">Current mileage</legend>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {VSC_MILEAGE.map((m, i) => (
                      <label key={m} className="choice">
                        <input type="radio" value={m} {...register("mileage")} />
                        <span>{MILEAGE_LABEL(m, i)}</span>
                      </label>
                    ))}
                  </div>
                  {err("mileage")}
                </fieldset>
                <div className="grid gap-6 sm:grid-cols-2">
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
              </>
            )}

            {current.key === "plan" && (
              <fieldset aria-describedby={errors.planInterest ? "planInterest-error" : undefined}>
                <legend className="sr-only">Plan level</legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {PLAN_CHOICES.map(([value, title, detail]) => (
                    <label key={value} className="choice">
                      <input type="radio" value={value} {...register("planInterest")} />
                      <span>
                        <span className="block">{title}</span>
                        <span className="mt-0.5 block text-sm font-normal text-road">{detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {err("planInterest")}
              </fieldset>
            )}

            {current.key === "contact" && (
              <>
                <div className="grid gap-6 sm:grid-cols-2">
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
                <div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-rail bg-white p-4 text-sm leading-relaxed text-road transition hover:border-road/40 has-[:checked]:border-sky has-[:checked]:bg-sky/[0.04]">
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-sky" {...aria("consent")} {...register("consent")} />
                    <span id="consent-text">{consentText}</span>
                  </label>
                  {err("consent")}
                </div>
              </>
            )}
          </div>

          {serverError && (
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{serverError}</p>
          )}
          {isLast && <p className="mt-6 text-xs leading-relaxed text-road">{VSC_DISCLOSURE}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-rail bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          {step > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
              <Arrow dir="left" /> Back
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
          {isLast ? (
            <button key="submit" type="submit" className="btn-primary bg-line text-asphalt hover:bg-[#E3B21F] sm:min-w-52">
              See my prices <Arrow dir="right" />
            </button>
          ) : (
            <button key="next" type="button" onClick={next} className="btn-primary bg-line text-asphalt hover:bg-[#E3B21F] sm:min-w-44">
              Continue <Arrow dir="right" />
            </button>
          )}
        </div>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6">
        <div className="hidden rounded-2xl border border-rail bg-white p-6 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-road/70">Your quote</p>
          <ol className="mt-4">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.key} className="relative pb-5 pl-11 last:pb-0">
                  {i < STEPS.length - 1 && <span aria-hidden className={`absolute left-[13px] top-8 h-[calc(100%-2rem)] w-0.5 ${done ? "bg-sky" : "bg-rail"}`} />}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition ${
                      done ? "bg-sky text-white" : active ? "border-2 border-sky bg-white text-sky ring-4 ring-sky/15" : "border-2 border-rail bg-white text-road/60"
                    }`}
                  >
                    {done ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  {done ? (
                    <button type="button" onClick={() => setStep(i)} className="pt-0.5 text-left text-[15px] font-medium text-asphalt hover:text-sky">{s.label}</button>
                  ) : (
                    <span aria-current={active ? "step" : undefined} className={`block pt-0.5 text-[15px] ${active ? "font-semibold text-asphalt" : "text-road/70"}`}>{s.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-2xl bg-[linear-gradient(135deg,#0B2F5B_0%,#1F5FAD_100%)] p-6 text-white">
          <p className="text-lg font-bold">Prefer to talk to someone?</p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/80">Our team can explain plan options and prices by phone.</p>
          <a href={phoneHref} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-asphalt transition hover:bg-white/90">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
            {phone}
          </a>
        </div>

        <ul className="space-y-3 rounded-2xl border border-rail bg-white p-6 text-sm text-road">
          {["Free quote, no obligation", "30-day money-back guarantee", "Several plan levels to choose from", "Real people to help you"].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky/10 text-sky">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </aside>
    </form>
  );
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="M19 12H5m6-6-6 6 6 6" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
    </svg>
  );
}
