import { requireBlogAccess } from "@/lib/admin-guard";
import { isEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { PostEditor } from "../PostEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "New post" };

export default async function NewPostPage() {
  const me = await requireBlogAccess();
  const [categories, { blog }] = await Promise.all([db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }), getSettings()]);
  const editor = isEditor(me);
  return (
    <PostEditor
      siteUrl={site.url}
      categories={categories}
      revisions={[]}
      perms={{ canEdit: true, canPublish: editor || blog.writersCanPublish, editor, canDelete: false }}
      post={{
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        categoryId: null,
        tags: "",
        coverImageId: null,
        coverAlt: "",
        seoTitle: "",
        seoDescription: "",
        noindex: false,
        featured: false,
        status: "draft",
        publishedAt: null,
        authorName: me.name,
      }}
    />
  );
}
