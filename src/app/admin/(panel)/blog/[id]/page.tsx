import { notFound } from "next/navigation";
import { requireBlogAccess } from "@/lib/admin-guard";
import { isEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { PostEditor } from "../PostEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireBlogAccess();
  const { id } = await params;
  const [post, categories, { blog }] = await Promise.all([
    db.post.findUnique({
      where: { id },
      include: {
        author: { select: { name: true } },
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        revisions: { orderBy: { createdAt: "desc" }, take: 25, select: { id: true, createdAt: true, editor: { select: { name: true } } } },
      },
    }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    getSettings(),
  ]);
  const editor = isEditor(me);
  if (!post || (!editor && post.authorId !== me.id)) notFound();

  const own = post.authorId === me.id;
  const canPublish = editor || (own && blog.writersCanPublish);
  const canEdit = editor || (own && (post.status !== "published" || blog.writersCanPublish));

  return (
    <PostEditor
      key={post.id}
      siteUrl={site.url}
      categories={categories}
      revisions={post.revisions.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), editor: r.editor.name }))}
      perms={{ canEdit, canPublish, editor, canDelete: editor || (own && post.status !== "published") }}
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        categoryId: post.categoryId,
        tags: post.tags.map((t) => t.name).join(", "),
        coverImageId: post.coverImageId,
        coverAlt: post.coverAlt,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        noindex: post.noindex,
        featured: post.featured,
        status: post.status,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        authorName: post.author.name,
      }}
    />
  );
}
