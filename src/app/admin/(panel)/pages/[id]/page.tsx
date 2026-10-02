import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { PageEditor } from "../PageEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("admin");
  const p = await db.page.findUnique({ where: { id: (await params).id } });
  if (!p) notFound();
  return (
    <PageEditor
      key={p.id}
      siteUrl={site.url}
      page={{
        id: p.id,
        title: p.title,
        slug: p.slug,
        intro: p.intro,
        content: p.content,
        status: p.status === "published" ? "published" : "draft",
        layout: p.layout === "wide" ? "wide" : "standard",
        showQuoteCta: p.showQuoteCta,
        coverImageId: p.coverImageId,
        coverAlt: p.coverAlt,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        noindex: p.noindex,
      }}
    />
  );
}
