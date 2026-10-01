import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { db } from "@/lib/db";
import { ogMetadata } from "@/lib/og";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
const getCategory = cache((slug: string) => db.category.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, description: true } }));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [c, sp] = await Promise.all([params.then((p) => getCategory(p.slug)), searchParams]);
  if (!c) return { title: "Category not found", robots: { index: false } };
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const url = `/blog/category/${c.slug}`;
  const description = c.description || `Articles about ${c.name.toLowerCase()} from ${site.name}.`;
  return {
    title: page > 1 ? `${c.name} (page ${page})` : c.name,
    description,
    alternates: { canonical: page > 1 ? `${url}?page=${page}` : url },
    ...ogMetadata({ eyebrow: "Blog", title: c.name, subtitle: description }, { url, title: `${c.name} | ${site.name}`, description }),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [c, sp, { blog }] = await Promise.all([params.then((p) => getCategory(p.slug)), searchParams, getSettings()]);
  if (!c) notFound();
  return (
    <BlogIndex
      eyebrow="Category"
      heading={c.name}
      intro={c.description}
      filter={{ categoryId: c.id }}
      basePath={`/blog/category/${c.slug}`}
      page={Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)}
      perPage={blog.postsPerPage}
      activeCategory={c.slug}
    />
  );
}
