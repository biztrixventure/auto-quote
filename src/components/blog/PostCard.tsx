import Link from "next/link";
import { formatDate, mediaUrl, type PostCardData } from "@/lib/blog";

export function AuthorAvatar({ name, avatarId, size = 28 }: { name: string; avatarId: string | null; size?: number }) {
  const src = mediaUrl(avatarId);
  if (src) return <img src={src} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-asphalt font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Cover({ post, className, priority }: { post: PostCardData; className: string; priority?: boolean }) {
  const src = mediaUrl(post.coverImageId);
  if (src) {
    return <img src={src} alt={post.coverAlt} loading={priority ? "eager" : "lazy"} decoding="async" className={`${className} object-cover transition duration-500 group-hover:scale-[1.03]`} />;
  }
  // No cover: a branded panel with the category, so the grid still looks finished.
  return (
    <div className={`${className} grid place-items-center bg-[linear-gradient(135deg,#262A30_0%,#3A4049_60%,#1F5FAD_140%)] p-6`}>
      <span className="text-center text-sm font-bold uppercase tracking-[0.16em] text-line">{post.category?.name ?? "Vertex AutoCare"}</span>
    </div>
  );
}

function Meta({ post }: { post: PostCardData }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-road">
      <AuthorAvatar name={post.author.name} avatarId={post.author.avatarId} />
      <span className="font-medium text-asphalt">{post.author.name}</span>
      <span aria-hidden>·</span>
      {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>}
      <span aria-hidden className="hidden sm:inline">·</span>
      <span className="hidden sm:inline">{post.readingMinutes} min read</span>
    </div>
  );
}

export function PostCard({ post }: { post: PostCardData }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-rail bg-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(38,42,48,0.10)]">
      <div className="overflow-hidden">
        <Cover post={post} className="aspect-[16/9] w-full" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        {post.category && <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky">{post.category.name}</p>}
        <h3 className="mt-2 text-lg font-bold leading-snug text-asphalt">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-sky">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 flex-1 text-[15px] leading-relaxed text-road">{post.excerpt}</p>}
        <div className="mt-5"><Meta post={post} /></div>
      </div>
    </article>
  );
}

export function FeaturedPostCard({ post }: { post: PostCardData }) {
  return (
    <article className="group relative grid overflow-hidden rounded-3xl border border-rail bg-white transition hover:shadow-[0_16px_40px_rgba(38,42,48,0.10)] lg:grid-cols-[1.25fr_1fr]">
      <div className="overflow-hidden">
        <Cover post={post} className="aspect-[16/9] h-full w-full lg:aspect-auto lg:min-h-[340px]" priority />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky">
          <span className="mr-2 rounded-full bg-line px-2.5 py-1 text-asphalt">Featured</span>
          {post.category?.name}
        </p>
        <h2 className="mt-4 text-2xl font-extrabold leading-tight text-asphalt sm:text-3xl">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-sky">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="mt-3 line-clamp-4 text-base leading-relaxed text-road">{post.excerpt}</p>}
        <div className="mt-6"><Meta post={post} /></div>
      </div>
    </article>
  );
}
