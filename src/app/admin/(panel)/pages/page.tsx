import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { PageHeader, btnPrimary, dateTime } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

// Pages that are part of the site itself; their words are edited elsewhere.
const BUILT_IN = [
  { title: "Home", href: "/", edit: "/admin/content#hero", what: "Hero text, reviews, FAQs" },
  { title: "Repair costs", href: "/repair-costs", edit: "/admin/content#repair", what: "Repair prices" },
  { title: "Why us", href: "/why-us", edit: "/admin/content#why", what: "Reasons and intro" },
  { title: "FAQ", href: "/faq", edit: "/admin/content#faqs", what: "Questions and answers" },
  { title: "Blog", href: "/blog", edit: "/admin/blog", what: "Posts and categories" },
  { title: "Get a quote", href: "/quote/vehicle-protection", edit: "/admin/settings", what: "Quote form, consent text" },
];

export default async function PagesPage() {
  await requireAdmin("admin");
  const pages = await db.page.findMany({ orderBy: [{ status: "desc" }, { title: "asc" }], select: { id: true, title: true, slug: true, status: true, updatedAt: true, noindex: true } });
  return (
    <>
      <PageHeader
        title="Pages"
        subtitle="Create pages like About us, Contact or a landing page for an ad campaign. Then add them to a menu."
        actions={
          <>
            <Link href="/admin/menus" className="inline-flex items-center rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F9FAFB]">Menus</Link>
            <Link href="/admin/pages/new" className={btnPrimary}>+ New page</Link>
          </>
        }
      />

      <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="border-b border-[#EEF0F3] px-5 py-3.5"><h2 className="text-[15px] font-semibold">Your pages</h2></div>
        {pages.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="font-semibold">No pages yet</p>
            <p className="mt-1 text-sm text-road">Good first pages: About us, Contact us, How it works.</p>
            <Link href="/admin/pages/new" className={`${btnPrimary} mt-4`}>+ Create a page</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
                <tr>{["Title", "Address", "Status", "Last edited", ""].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0F3]">
                {pages.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FCFCFD]">
                    <td className="px-4 py-3"><Link href={`/admin/pages/${p.id}`} className="font-semibold text-asphalt hover:text-sky">{p.title}</Link></td>
                    <td className="px-4 py-3 text-road">/{p.slug}{p.noindex && <span className="ml-2 rounded bg-[#F2F4F7] px-1.5 py-0.5 text-[11px]">hidden from Google</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F4F7] text-road"}`}>{p.status === "published" ? "Published" : "Draft"}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-road">{dateTime(p.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "published" && <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky hover:underline">View ↗</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="border-b border-[#EEF0F3] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">Built-in pages</h2>
          <p className="mt-0.5 text-xs text-road">Part of the site. Their words are edited where shown.</p>
        </div>
        <ul className="divide-y divide-[#EEF0F3] text-sm">
          {BUILT_IN.map((b) => (
            <li key={b.href} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span>
                <span className="font-semibold">{b.title}</span> <span className="text-road">{b.href}</span>
                <span className="block text-xs text-road">{b.what}</span>
              </span>
              <span className="flex gap-4">
                <Link href={b.edit} className="font-semibold text-sky hover:underline">Edit</Link>
                <a href={b.href} target="_blank" rel="noreferrer" className="font-semibold text-road hover:text-asphalt">View ↗</a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
