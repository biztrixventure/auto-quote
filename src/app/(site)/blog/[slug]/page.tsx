import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { PostArticle } from "@/components/blog/PostArticle";
import { absoluteUrl, cardSelect, livePosts, mediaUrl, wordCount } from "@/lib/blog";
import { db } from "@/lib/db";
import { ogMetadata } from "@/lib/og";
import { jsonLd } from "@/lib/security";
import { fillCompany, getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

// One query per request, shared by the metadata and the page.
const getPost = cache((slug: string) =>
  db.post.findFirst({
    where: { AND: [{ slug }, livePosts()] },
    include: {
      author: { select: { name: true, bio: true, avatarId: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: { select: { name: true, slug: true }, orderBy: { name: "asc" } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const url = `/blog/${post.slug}`;
  const og = ogMetadata({ eyebrow: post.category?.name ?? "Blog", title: post.title, subtitle: post.excerpt }, { url, title, description });
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    authors: [{ name: post.author.name }],
    keywords: post.tags.map((t) => t.name),
    openGraph: {
      ...og.openGraph,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.name],
      section: post.category?.name,
      tags: post.tags.map((t) => t.name),
    },
    twitter: og.twitter,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const { blog } = await getSettings();

  const pick = { ...cardSelect };
  let related = post.categoryId
    ? await db.post.findMany({ where: { AND: [livePosts(), { categoryId: post.categoryId }, { NOT: { id: post.id } }] }, orderBy: { publishedAt: "desc" }, take: 3, select: pick })
    : [];
  if (related.length < 3) {
    const more = await db.post.findMany({ where: { AND: [livePosts(), { NOT: { id: { in: [post.id, ...related.map((r) => r.id)] } } }] }, orderBy: { publishedAt: "desc" }, take: 3 - related.length, select: pick });
    related = [...related, ...more];
  }

  // Count the view after the page is sent, so it never slows the visitor down.
  after(() => db.post.update({ where: { id: post.id }, data: { views: { increment: 1 } }, select: { id: true } }).catch(() => {}));

  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.coverImageId ? absoluteUrl(mediaUrl(post.coverImageId)!) : absoluteUrl("/opengraph-image");
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        headline: post.title.slice(0, 110),
        description: post.seoDescription || post.excerpt,
        image: [image],
        datePublished: post.publishedAt?.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        wordCount: wordCount(post.content),
        articleSection: post.category?.name,
        keywords: post.tags.map((t) => t.name).join(", ") || undefined,
        author: { "@type": "Person", name: post.author.name },
        publisher: { "@id": `${site.url}/#organization` },
        isPartOf: { "@type": "Blog", name: fillCompany(blog.title), url: absoluteUrl("/blog") },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
          ...(post.category ? [{ "@type": "ListItem", position: 3, name: post.category.name, item: absoluteUrl(`/blog/category/${post.category.slug}`) }] : []),
          { "@type": "ListItem", position: post.category ? 4 : 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PostArticle post={post} related={related} blog={blog} />
    </>
  );
}
