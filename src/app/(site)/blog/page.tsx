import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { ogMetadata } from "@/lib/og";
import { fillCompany, getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

type Search = { page?: string; q?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const [{ blog }, sp] = await Promise.all([getSettings(), searchParams]);
  const title = fillCompany(blog.title);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return {
    title: page > 1 ? `${title} (page ${page})` : title,
    description: blog.intro,
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : "/blog", types: { "application/rss+xml": [{ url: "/blog/rss.xml", title }] } },
    robots: sp.q ? { index: false, follow: true } : undefined, // search results stay out of Google
    ...ogMetadata({ eyebrow: "Blog", title, subtitle: blog.intro }, { url: "/blog", title: `${title} | ${site.name}`, description: blog.intro }),
  };
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ blog }, sp] = await Promise.all([getSettings(), searchParams]);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return (
    <BlogIndex
      eyebrow="Blog"
      heading={fillCompany(blog.title)}
      intro={blog.intro}
      basePath="/blog"
      page={page}
      perPage={blog.postsPerPage}
      q={sp.q?.trim().slice(0, 100)}
      showFeatured
    />
  );
}
