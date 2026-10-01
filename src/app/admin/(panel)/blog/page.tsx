import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireBlogAccess } from "@/lib/admin-guard";
import { isEditor } from "@/lib/auth";
import { POST_STATUSES, postState, type PostState } from "@/lib/blog";
import { db } from "@/lib/db";
import { Notice } from "@/components/admin/forms";
import { PageHeader, btnPrimary, btnSecondary, dateTime } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
const PAGE = 20;

const STYLE: Record<PostState, string> = {
  published: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-sky/10 text-sky",
  review: "bg-amber-50 text-amber-800",
  draft: "bg-[#F2F4F7] text-road",
};

function stateWhere(s: string): Prisma.PostWhereInput {
  const now = new Date();
  if (s === "published") return { status: "published", publishedAt: { lte: now } };
  if (s === "scheduled") return { status: "published", publishedAt: { gt: now } };
  if (s === "review" || s === "draft") return { status: s };
  return {};
}

type Search = { status?: string; q?: string; page?: string; saved?: string; error?: string };

export default async function BlogPostsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireBlogAccess();
  const editor = isEditor(me);
  const sp = await searchParams;
  const status = sp.status && sp.status in POST_STATUSES ? sp.status : "";
  const q = sp.q?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const mine: Prisma.PostWhereInput = editor ? {} : { authorId: me.id };
  const search: Prisma.PostWhereInput = q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }] } : {};
  const where: Prisma.PostWhereInput = { AND: [mine, search, stateWhere(status)] };

  const [posts, total, counts] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { id: true, title: true, slug: true, status: true, publishedAt: true, updatedAt: true, views: true, featured: true, author: { select: { name: true } }, category: { select: { name: true } } },
    }),
    db.post.count({ where }),
    Promise.all((["", "published", "scheduled", "review", "draft"] as const).map((s) => db.post.count({ where: { AND: [mine, stateWhere(s)] } }))),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (over: Partial<Search>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, ...over })) if (v) p.set(k, v);
    return `/admin/blog${p.size ? `?${p}` : ""}`;
  };
  const tabs: [string, string, number][] = [
    ["", "All", counts[0]],
    ["published", "Published", counts[1]],
    ["scheduled", "Scheduled", counts[2]],
    ["review", "In review", counts[3]],
    ["draft", "Drafts", counts[4]],
  ];

  return (
    <>
      <PageHeader
        title={editor ? "Blog posts" : "My posts"}
        subtitle={editor ? "Write, review and publish articles for the website blog." : "Write posts and send them for review. An admin publishes them."}
        actions={
          <>
            <Link href="/blog" target="_blank" className={btnSecondary}>View blog ↗</Link>
            <Link href="/admin/blog/new" className={btnPrimary}>+ New post</Link>
          </>
        }
      />
      <Notice saved={sp.saved} error={sp.error} />

      {editor && counts[3] > 0 && status !== "review" && (
        <Link href={href({ status: "review", page: "" })} className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100">
          {counts[3]} post{counts[3] === 1 ? " is" : "s are"} waiting for your review
          <span>Review →</span>
        </Link>
      )}

      <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-3 border-b border-[#EEF0F3] p-4 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap gap-1 text-sm">
            {tabs.map(([v, l, n]) => (
              <Link key={v || "all"} href={href({ status: v, page: "" })} aria-current={status === v ? "page" : undefined} className={`rounded-lg px-3 py-1.5 font-semibold ${status === v ? "bg-asphalt text-white" : "text-road hover:bg-[#F2F4F7]"}`}>
                {l} <span className="ml-0.5 tabular-nums opacity-70">{n}</span>
              </Link>
            ))}
          </nav>
          <form className="flex gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <input name="q" defaultValue={q} placeholder="Search titles" aria-label="Search posts" className="h-9 w-56 rounded-lg border border-[#D0D5DD] px-3 text-sm focus:border-sky focus:outline-none" />
            <button className="h-9 rounded-lg bg-asphalt px-3 text-sm font-semibold text-white hover:bg-road">Search</button>
          </form>
        </div>

        {posts.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="font-semibold">{counts[0] === 0 ? "No posts yet" : "Nothing matches"}</p>
            <p className="mt-1 text-sm text-road">{counts[0] === 0 ? "Write your first article. Helpful posts bring visitors from Google." : "Try another tab or search."}</p>
            {counts[0] === 0 && <Link href="/admin/blog/new" className={`${btnPrimary} mt-4`}>+ Write the first post</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
                <tr>
                  {["Title", "Status", "Author", "Category", "Date", "Views"].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0F3]">
                {posts.map((p) => {
                  const state = postState(p);
                  return (
                    <tr key={p.id} className="hover:bg-[#FCFCFD]">
                      <td className="max-w-[380px] px-4 py-3">
                        <Link href={`/admin/blog/${p.id}`} className="font-semibold text-asphalt hover:text-sky">
                          {p.featured && <span title="Featured" className="mr-1 text-line">★</span>}
                          {p.title}
                        </Link>
                        <span className="block truncate text-xs text-road">/blog/{p.slug}</span>
                      </td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLE[state]}`}>{POST_STATUSES[state]}</span></td>
                      <td className="px-4 py-3">{p.author.name}</td>
                      <td className="px-4 py-3 text-road">{p.category?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-road">
                        {state === "published" || state === "scheduled" ? dateTime(p.publishedAt!) : <>Edited {dateTime(p.updatedAt)}</>}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-road">{p.views.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#EEF0F3] px-4 py-3 text-sm text-road">
            <span>{total} posts</span>
            <span className="flex items-center gap-2">
              {page > 1 && <Link href={href({ page: String(page - 1) })} className={btnSecondary}>← Newer</Link>}
              Page {page} of {pages}
              {page < pages && <Link href={href({ page: String(page + 1) })} className={btnSecondary}>Older →</Link>}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
