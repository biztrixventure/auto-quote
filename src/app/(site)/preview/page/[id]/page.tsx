import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomPage } from "@/components/CustomPage";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

// Shows a draft page exactly as visitors will see it once published.
export default async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("admin");
  const p = await db.page.findUnique({ where: { id: (await params).id } });
  if (!p) notFound();
  return (
    <>
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2.5 text-sm font-semibold text-asphalt">
        Preview · {p.status === "published" ? "Published" : "Draft: visitors can't see this page yet"}
        <Link href={`/admin/pages/${p.id}`} className="rounded-md bg-asphalt px-3 py-1 text-white">Back to editor</Link>
      </div>
      <CustomPage page={p} />
    </>
  );
}
