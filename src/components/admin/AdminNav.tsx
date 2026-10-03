"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Role = "writer" | "agent" | "admin" | "owner";
const RANK: Record<Role, number> = { writer: 0, agent: 1, admin: 2, owner: 3 }; // keep in sync with src/lib/auth.ts
const BLOG: Role[] = ["writer", "admin", "owner"];

const icon = (d: string) => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// `roles` lists exactly who sees the item; otherwise everyone at or above `min`.
type Item = { href: string; label: string; icon: React.ReactNode; min: Role; roles?: Role[]; exact?: boolean };

export const NAV: { group: string; items: Item[] }[] = [
  {
    group: "Work",
    items: [
      { href: "/admin", label: "Dashboard", min: "agent", exact: true, icon: icon("M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z") },
      { href: "/admin/leads", label: "Leads", min: "agent", icon: icon("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75") },
      { href: "/admin/reports", label: "Reports", min: "admin", icon: icon("M3 3v18h18M7 15l4-4 3 3 5-6") },
    ],
  },
  {
    group: "Blog",
    items: [
      { href: "/admin/blog", label: "Posts", min: "admin", roles: BLOG, icon: icon("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z") },
      { href: "/admin/blog/media", label: "Images", min: "admin", roles: BLOG, icon: icon("M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01") },
      { href: "/admin/blog/settings", label: "Categories & settings", min: "admin", icon: icon("M4 6h16M4 12h10M4 18h7") },
    ],
  },
  {
    group: "Website",
    items: [
      { href: "/admin/pages", label: "Pages", min: "admin", icon: icon("M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5") },
      { href: "/admin/states", label: "State guides", min: "admin", icon: icon("M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z") },
      { href: "/admin/menus", label: "Menus", min: "admin", icon: icon("M3 6h18M3 12h18M3 18h12") },
      { href: "/admin/content", label: "Content", min: "admin", icon: icon("M4 4h16v16H4zM8 8h8M8 12h8M8 16h5") },
      { href: "/admin/legal", label: "Legal & privacy", min: "admin", icon: icon("M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8") },
    ],
  },
  {
    group: "Business",
    items: [
      { href: "/admin/partners", label: "Partners", min: "admin", icon: icon("M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01") },
      { href: "/admin/pricing", label: "Pricing", min: "admin", icon: icon("M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6") },
      { href: "/admin/buyers", label: "Lead buyers", min: "admin", icon: icon("M7 10l5-5 5 5M12 5v12M5 21h14") },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/admin/settings", label: "Settings", min: "admin", icon: icon("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4M7.7 16.3l-1.4 1.4") },
      { href: "/admin/privacy", label: "Privacy", min: "admin", icon: icon("M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3z") },
      { href: "/admin/api-keys", label: "API keys", min: "admin", icon: icon("M15 7a4 4 0 1 1-3.4 6.1L3 21.6V18h3v-3h3l2.6-2.6A4 4 0 0 1 15 7zM17 9h.01") },
      { href: "/admin/activity", label: "Activity", min: "admin", icon: icon("M22 12h-4l-3 9L9 3l-3 9H2") },
      { href: "/admin/health", label: "System health", min: "admin", icon: icon("M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z") },
      { href: "/admin/users", label: "Users", min: "owner", icon: icon("M16 11a4 4 0 1 0-8 0M12 15c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4") },
    ],
  },
];

export function AdminNav({ variant, role }: { variant: "side" | "top"; role: Role }) {
  const path = usePathname();
  // Most specific match wins, so /admin/blog/media highlights "Images", not "Posts".
  const hrefs = NAV.flatMap((g) => g.items.map((i) => i.href));
  const isActive = (href: string, exact?: boolean) => {
    if (exact) return path === href;
    if (path !== href && !path.startsWith(`${href}/`)) return false;
    return !hrefs.some((h) => h.length > href.length && (path === h || path.startsWith(`${h}/`)));
  };
  const visible = (i: Item) => (i.roles ? i.roles.includes(role) : (RANK[role] ?? -1) >= RANK[i.min]);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length);

  if (variant === "top") {
    return (
      <nav className="-mr-4 flex gap-1 overflow-x-auto pr-4 [scrollbar-width:none]">
        {groups.flatMap((g) => g.items).map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href, i.exact) ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold ${isActive(i.href, i.exact) ? "bg-white/15 text-white" : "text-white/70"}`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">{g.group}</p>
          <div className="space-y-0.5">
            {g.items.map((i) => {
              const active = isActive(i.href, i.exact);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-[7px] text-sm font-medium transition ${
                    active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-[#FFB020]" : ""}>{i.icon}</span>
                  {i.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
