import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Notice } from "@/components/admin/forms";
import { Card, PageHeader } from "@/components/admin/ui";
import { deletePartner } from "../actions";
import { PartnerForm } from "../PartnerForm";

export const dynamic = "force-dynamic";

export default async function EditPartnerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireAdmin("admin");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const partner = id === "new" ? undefined : await db.partner.findUnique({ where: { id } });
  if (id !== "new" && !partner) notFound();

  return (
    <>
      <Link href="/admin/partners" className="inline-flex items-center gap-1.5 text-sm font-medium text-road hover:text-asphalt">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
        All partners
      </Link>
      <div className="mt-4">
        <PageHeader
          title={partner ? partner.name : "Add partner"}
          subtitle={partner ? "Changes apply to new quote requests right away." : "Set where this partner quotes and which drivers it accepts."}
        />
      </div>
      <Notice error={error} />
      <PartnerForm partner={partner ?? undefined} />

      {partner && (
        <div className="mt-8 max-w-xl">
          <Card title="Danger zone">
            <p className="text-sm text-road">
              Deleting removes this partner from future results. To stop showing it for now, untick “Show in quote results” instead.
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-red-700">Delete this partner…</summary>
              <form action={deletePartner} className="mt-3">
                <input type="hidden" name="id" value={partner.id} />
                <button className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">Yes, delete {partner.name}</button>
              </form>
            </details>
          </Card>
        </div>
      )}
    </>
  );
}
