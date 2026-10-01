import Link from "next/link";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/blog/PostArticle";
import { requireBlogAccess } from "@/lib/admin-guard";
import { isEditor } from "@/lib/auth";
import { POST_STATUSES, postState } from "@/lib/blog";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

// Lets writers and admins see a draft exactly as it will look, before it goes live.
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireBlogAccess();
  const { id } = await params;
  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, bio: true, avatarId: true } },
      category: { select: { name: true, slug: true } },
      tags: { select: { name: true, slug: true }, orderBy: { name: "asc" } },
    },
  });
  if (!post || (!isEditor(me) && post.authorId !== me.id)) notFound();
  const { blog } = await getSettings();
  const state = postState(post);

  return (
    <>
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2.5 text-sm font-semibold text-asphalt">
        Preview · {POST_STATUSES[state]}. Visitors {state === "published" ? "can" : "can't"} see this post yet.
        <Link href={`/admin/blog/${post.id}`} className="rounded-md bg-asphalt px-3 py-1 text-white">Back to editor</Link>
      </div>
      <PostArticle post={{ ...post, publishedAt: post.publishedAt ?? post.updatedAt }} related={[]} blog={blog} />
    </>
  );
}
