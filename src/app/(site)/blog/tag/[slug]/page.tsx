import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
const getTag = cache((slug: string) => db.tag.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTag((await params).slug);
  if (!t) return { title: "Tag not found", robots: { index: false } };
  // Tag pages help visitors browse; they stay out of Google so they don't compete with categories.
  return { title: `Articles tagged “${t.name}”`, alternates: { canonical: `/blog/tag/${t.slug}` }, robots: { index: false, follow: true } };
}

export default async function TagPage({ params, searchParams }: Props) {
  const [t, sp, { blog }] = await Promise.all([params.then((p) => getTag(p.slug)), searchParams, getSettings()]);
  if (!t) notFound();
  return (
    <BlogIndex
      eyebrow="Tag"
      heading={`#${t.name}`}
      filter={{ tags: { some: { id: t.id } } }}
      basePath={`/blog/tag/${t.slug}`}
      page={Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)}
      perPage={blog.postsPerPage}
    />
  );
}
