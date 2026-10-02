import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CustomPage } from "@/components/CustomPage";
import { autoExcerpt } from "@/lib/blog";
import { db } from "@/lib/db";
import { ogMetadata } from "@/lib/og";
import { site } from "@/lib/site";

// Pages created in /admin/pages. Built-in routes (/blog, /faq, /quote…) take priority over this.
const getPage = cache((slug: string) => (/^[a-z0-9-]{1,80}$/.test(slug) ? db.page.findFirst({ where: { slug, status: "published" } }) : null));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPage((await params).slug);
  if (!p) return { title: "Page not found", robots: { index: false } };
  const title = p.seoTitle || p.title;
  const description = p.seoDescription || p.intro || autoExcerpt(p.content);
  const url = `/${p.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: p.noindex ? { index: false, follow: true } : undefined,
    ...ogMetadata({ title: p.title, subtitle: description }, { url, title: `${title} | ${site.name}`, description }),
  };
}

export default async function CustomPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPage((await params).slug);
  if (!p) notFound();
  return <CustomPage page={p} />;
}
