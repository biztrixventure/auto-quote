import type { ReactNode } from "react";

export const inputCls =
  "block h-10 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm text-asphalt shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-road/45 focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15";

export function FormField({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-asphalt">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-road">{hint}</p>}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked, value = "on", hint }: { name: string; label: string; defaultChecked?: boolean; value?: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-sky" />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-road">{hint}</span>}
      </span>
    </label>
  );
}

// Banner shown after a save: driven by ?saved= and ?error= in the URL.
export function Notice({ saved, error }: { saved?: string; error?: string }) {
  if (error)
    return (
      <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
        {error}
      </div>
    );
  if (saved)
    return (
      <div role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
        {saved}
      </div>
    );
  return null;
}

export function SectionFooter({ children }: { children: ReactNode }) {
  return <div className="-mx-5 -mb-5 mt-5 flex justify-end gap-2 border-t border-[#EEF0F3] bg-[#FCFCFD] px-5 py-3">{children}</div>;
}
