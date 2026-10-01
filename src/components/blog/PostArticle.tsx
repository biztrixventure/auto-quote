import Link from "next/link";
import { absoluteUrl, formatDate, mediaUrl, withHeadingIds, type PostCardData } from "@/lib/blog";
import type { BlogSettings } from "@/lib/settings";
import { AuthorAvatar, PostCard } from "./PostCard";
import { ShareButtons } from "./ShareButtons";

export type ArticleData = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: Date | null;
  updatedAt: Date;
  readingMinutes: number;
  coverImageId: string | null;
  coverAlt: string;
  category: { name: string; slug: string } | null;
  tags: { name: string; slug: string }[];
  author: { name: string; bio: string; avatarId: string | null };
};

export function PostArticle({ post, related, blog }: { post: ArticleData; related: PostCardData[]; blog: BlogSettings }) {
  const { html, toc } = withHeadingIds(post.content);
  const cover = mediaUrl(post.coverImageId);
  const updated = post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > 86_400_000 ? post.updatedAt : null;
  const url = absoluteUrl(`/blog/${post.slug}`);
  const showToc = toc.filter((t) => t.level === 2).length >= 3;

  return (
    <article className="bg-white">
      <header className="mx-auto max-w-3xl px-5 pt-10 text-center md:pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-road">
          <ol className="flex flex-wrap items-center justify-center gap-1.5">
            <li><Link href="/" className="hover:text-sky">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/blog" className="hover:text-sky">Blog</Link></li>
            {post.category && (
              <>
                <li aria-hidden>/</li>
                <li><Link href={`/blog/category/${post.category.slug}`} className="hover:text-sky">{post.category.name}</Link></li>
              </>
            )}
          </ol>
        </nav>
        <h1 className="mt-5 text-[2.1rem] font-extrabold leading-[1.12] tracking-tight text-asphalt sm:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-road sm:text-xl">{post.excerpt}</p>}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-road">
          <span className="flex items-center gap-2.5">
            <AuthorAvatar name={post.author.name} avatarId={post.author.avatarId} size={36} />
            <span className="font-semibold text-asphalt">{post.author.name}</span>
          </span>
          <span aria-hidden>·</span>
          {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>}
          {updated && (
            <>
              <span aria-hidden>·</span>
              <span>Updated <time dateTime={updated.toISOString()}>{formatDate(updated)}</time></span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
      </header>

      {cover && (
        <figure className="mx-auto mt-10 max-w-5xl px-5">
          <img src={cover} alt={post.coverAlt} fetchPriority="high" className="aspect-[16/9] w-full rounded-2xl object-cover shadow-[0_20px_50px_rgba(38,42,48,0.12)]" />
        </figure>
      )}

      <div className={`mx-auto mt-12 px-5 pb-16 ${showToc ? "max-w-6xl lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14" : "max-w-3xl"}`}>
        {showToc && (
          <aside className="mb-10 lg:mb-0">
            <nav aria-label="On this page" className="rounded-xl border border-rail p-5 lg:sticky lg:top-6 lg:border-0 lg:p-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-road">On this page</p>
              <ol className="mt-3 space-y-2 text-sm">
                {toc.map((t) => (
                  <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                    <a href={`#${t.id}`} className="block leading-snug text-road transition hover:text-sky">{t.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        )}

        <div className="min-w-0 max-w-3xl">
          <div className="post-content" dangerouslySetInnerHTML={{ __html: html }} />

          {blog.showQuoteCta && (
            <aside className="mt-14 overflow-hidden rounded-2xl bg-asphalt p-7 text-white sm:p-9">
              <p className="text-2xl font-extrabold leading-tight sm:text-[1.7rem]">{blog.ctaTitle}</p>
              {blog.ctaText && <p className="mt-3 max-w-xl leading-relaxed text-white/75">{blog.ctaText}</p>}
              <Link href="/quote/auto" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-line px-6 py-3.5 font-bold text-asphalt transition hover:bg-[#E3B21F]">
                Get my free quote
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </aside>
          )}

          <div className="mt-12 flex flex-col gap-6 border-t border-rail pt-8 sm:flex-row sm:items-center sm:justify-between">
            {post.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/blog/tag/${t.slug}`} className="rounded-full bg-[#F2F4F7] px-3 py-1.5 text-sm font-medium text-asphalt hover:bg-[#E4E7EC]">#{t.name}</Link>
                  </li>
                ))}
              </ul>
            ) : <span />}
            <ShareButtons url={url} title={post.title} />
          </div>

          <section aria-label="About the author" className="mt-10 flex gap-5 rounded-2xl border border-rail bg-[#FAFBFC] p-6">
            <AuthorAvatar name={post.author.name} avatarId={post.author.avatarId} size={64} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-road">Written by</p>
              <p className="mt-1 text-lg font-bold text-asphalt">{post.author.name}</p>
              {post.author.bio && <p className="mt-2 leading-relaxed text-road">{post.author.bio}</p>}
            </div>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-rail bg-[#F7F8FA]">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-asphalt sm:text-3xl">Keep reading</h2>
              <Link href="/blog" className="font-semibold text-sky hover:underline">All articles →</Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
