import { requireBlogAccess } from "@/lib/admin-guard";
import { isEditor } from "@/lib/auth";
import { db } from "@/lib/db";
import { Notice } from "@/components/admin/forms";
import { PageHeader, btnSecondary } from "@/components/admin/ui";
import Link from "next/link";
import { deleteMedia } from "../actions";
import { CopyLink, MediaUpload } from "./MediaTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Images" };
const PAGE = 48;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ page?: string; saved?: string; error?: string }> }) {
  const me = await requireBlogAccess();
  const editor = isEditor(me);
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [items, total, used] = await Promise.all([
    db.media.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, fileName: true, width: true, height: true, size: true, createdAt: true, uploaderId: true } }),
    db.media.count(),
    db.post.findMany({ where: { coverImageId: { not: null } }, select: { coverImageId: true } }),
  ]);
  const covers = new Set(used.map((u) => u.coverImageId));
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader title="Images" subtitle="Everything uploaded for the blog. Images are resized and compressed automatically." actions={<MediaUpload />} />
      <Notice saved={sp.saved} error={sp.error} />
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-white px-4 py-16 text-center text-sm text-road">No images yet. Upload one, or add images while writing a post.</div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
              <a href={`/media/${m.id}`} target="_blank" rel="noreferrer" className="block bg-[#F6F7F9]">
                <img src={`/media/${m.id}`} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </a>
              <div className="space-y-1 p-2.5 text-xs">
                <p className="truncate font-medium" title={m.fileName}>{m.fileName}</p>
                <p className="text-road">{m.width}×{m.height} · {Math.max(1, Math.round(m.size / 1024))} KB{covers.has(m.id) ? " · cover" : ""}</p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <CopyLink path={`/media/${m.id}`} />
                  {(editor || m.uploaderId === me.id) && (
                    <form action={deleteMedia}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="font-semibold text-red-700 hover:underline">Delete</button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-road">
          {page > 1 && <Link href={`/admin/blog/media?page=${page - 1}`} className={btnSecondary}>← Newer</Link>}
          Page {page} of {pages}
          {page < pages && <Link href={`/admin/blog/media?page=${page + 1}`} className={btnSecondary}>Older →</Link>}
        </div>
      )}
    </>
  );
}
