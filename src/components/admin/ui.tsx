import type { ReactNode } from "react";
import { STATUS_LABELS, STATUS_STYLES } from "@/components/admin/statuses";

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const dateTime = (d: Date) => d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function timeAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [[60, "minute"], [3600, "hour"], [86400, "day"], [2592000, "month"], [31536000, "year"]];
  let [div, unit] = units[0];
  for (const u of units) if (s >= u[0]) [div, unit] = u;
  const n = Math.floor(s / div);
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-road"}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-[#EEF0F3] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-road">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-road">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children ?? <span className="font-normal text-road/60">—</span>}</dd>
    </div>
  );
}

export const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition";
export const btnPrimary = `${btn} bg-asphalt text-white hover:bg-road`;
export const btnSecondary = `${btn} border border-[#D0D5DD] bg-white text-asphalt hover:bg-[#F9FAFB]`;
