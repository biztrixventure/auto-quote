import Link from "next/link";
import { ROLES, type Role } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";
import { site } from "@/lib/site";
import { AdminNav } from "@/components/admin/AdminNav";
import { signOut } from "../actions";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const role = me.role as Role;
  const initials = me.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F6F7F9] lg:grid lg:grid-cols-[248px_1fr] lg:bg-[linear-gradient(to_right,#101828_248px,#F6F7F9_248px)]">
      <aside className="hidden flex-col bg-[#101828] px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/admin" className="flex items-center gap-3 px-2">
          <img src="/brand/logo-mark.webp" alt="" width={400} height={270} className="h-8 w-auto rounded bg-white p-1" />
          <span className="leading-tight">
            <span className="block text-sm font-bold text-white">{site.name}</span>
            <span className="block text-xs text-white/50">Lead management</span>
          </span>
        </Link>
        <div className="mt-8 flex-1 overflow-y-auto">
          <AdminNav variant="side" role={role} />
        </div>
        <div className="border-t border-white/10 pt-4">
          {!me.totpEnabled && (
            <Link href="/admin/account" className="mb-3 block rounded-lg bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/20">
              Turn on two-factor sign-in to protect your account →
            </Link>
          )}
          <Link href="/admin/account" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">{initials}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-white">{me.name}</span>
              <span className="block truncate text-xs text-white/50">{ROLES[role] ?? me.role} · My account</span>
            </span>
          </Link>
          <div className="mt-1 flex gap-1 text-sm">
            <Link href="/" target="_blank" className="flex-1 rounded-lg px-3 py-2 text-white/65 hover:bg-white/5 hover:text-white">View website</Link>
            <form action={signOut}>
              <button className="rounded-lg px-3 py-2 text-white/65 hover:bg-white/5 hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 bg-[#101828] px-4 py-3 lg:hidden">
          <Link href="/admin" className="shrink-0 text-sm font-bold text-white">{site.name}</Link>
          <AdminNav variant="top" role={role} />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
