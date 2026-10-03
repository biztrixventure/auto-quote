import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { cardSelect, livePosts } from "@/lib/blog";
import { db } from "@/lib/db";
import { FeaturedPostCard, PostCard } from "./PostCard";

type Props = {
  eyebrow?: string;
  heading: string;
  intro?: string;
  filter?: Prisma.PostWhereInput;
  basePath: string; // e.g. /blog or /blog/category/x (for pagination links)
  page: number;
  perPage: number;
  q?: string;
  activeCategory?: string;
  showFeatured?: boolean;
};

export async function BlogIndex({ eyebrow, heading, intro, filter = {}, basePath, page, perPage, q = "", activeCategory, showFeatured }: Props) {
  const search: Prisma.PostWhereInput = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { excerpt: { contains: q, mode: "insensitive" } }, { tags: { some: { name: { contains: q, mode: "insensitive" } } } }] }
    : {};
  const where: Prisma.PostWhereInput = { AND: [livePosts(), filter, search] };
  const featured = showFeatured && page === 1 && !q ? await db.post.findFirst({ where: { AND: [livePosts(), { featured: true }] }, orderBy: { publishedAt: "desc" }, select: cardSelect }) : null;
  const listWhere: Prisma.PostWhereInput = featured ? { AND: [where, { NOT: { id: featured.id } }] } : where;

  const [posts, total, categories] = await Promise.all([
    db.post.findMany({ where: listWhere, orderBy: { publishedAt: "desc" }, skip: (page - 1) * perPage, take: perPage, select: cardSelect }),
    db.post.count({ where: listWhere }),
    db.category.findMany({ where: { posts: { some: livePosts() } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (n > 1) p.set("page", String(n));
    return `${basePath}${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="bg-white">
      <section className="border-b border-rail bg-[linear-gradient(180deg,#F7F8FA_0%,#FFFFFF_100%)]">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 md:pb-14 md:pt-16">
          {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">{eyebrow}</p>}
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-asphalt sm:text-5xl">{heading}</h1>
          {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-road">{intro}</p>}

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="Categories" className="-mx-1 flex flex-wrap gap-2">
              <Link href="/blog" aria-current={!activeCategory ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!activeCategory ? "bg-asphalt text-white" : "border border-rail bg-white text-asphalt hover:border-asphalt"}`}>
                All posts
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/blog/category/${c.slug}`}
                  aria-current={activeCategory === c.slug ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === c.slug ? "bg-asphalt text-white" : "border border-rail bg-white text-asphalt hover:border-asphalt"}`}
                >
                  {c.name}
                </Link>
              ))}
            </nav>
            <form action="/blog" role="search" className="relative w-full lg:w-72">
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-road/60"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input name="q" defaultValue={q} placeholder="Search articles" aria-label="Search articles" className="h-11 w-full rounded-full border border-rail bg-white pl-10 pr-4 text-[15px] focus:border-sky focus:outline-none focus:ring-4 focus:ring-sky/15" />
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        {q && (
          <p className="mb-6 text-road">
            {total} result{total === 1 ? "" : "s"} for <strong className="text-asphalt">“{q}”</strong> · <Link href={basePath} className="font-semibold text-sky hover:underline">Clear search</Link>
          </p>
        )}
        {featured && <div className="mb-10"><FeaturedPostCard post={featured} /></div>}

        {posts.length === 0 && !featured ? (
          <div className="rounded-2xl border border-dashed border-rail px-6 py-20 text-center">
            <p className="text-lg font-bold">{q ? "No articles match your search" : "New articles are on the way"}</p>
            <p className="mt-2 text-road">{q ? "Try a different word." : "Check back soon for guides on car insurance and repair costs."}</p>
            <Link href="/quote" className="btn-primary mt-6 bg-line text-asphalt hover:bg-[#E3B21F]">Get a free quote</Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-2">
            {page > 1 && <Link href={pageHref(page - 1)} rel="prev" className="rounded-lg border border-rail px-4 py-2 text-sm font-semibold hover:border-asphalt">← Newer</Link>}
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
              .map((n, i, arr) => (
                <span key={n} className="flex items-center gap-2">
                  {i > 0 && n - arr[i - 1] > 1 && <span className="text-road">…</span>}
                  <Link href={pageHref(n)} aria-current={n === page ? "page" : undefined} className={`grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold ${n === page ? "bg-asphalt text-white" : "border border-rail hover:border-asphalt"}`}>
                    {n}
                  </Link>
                </span>
              ))}
            {page < pages && <Link href={pageHref(page + 1)} rel="next" className="rounded-lg border border-rail px-4 py-2 text-sm font-semibold hover:border-asphalt">Older →</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}
