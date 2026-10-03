import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { Notice } from "@/components/admin/forms";
import { Card, PageHeader, dateTime } from "@/components/admin/ui";
import { revokeKey } from "./actions";
import { NewKeyForm } from "./NewKeyForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "API keys" };

export default async function ApiKeysPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const me = await requireAdmin("admin");
  const sp = await searchParams;
  const keys = await db.apiKey.findMany({
    where: me.role === "owner" ? {} : { userId: me.id },
    orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: { id: true, name: true, prefix: true, canPublish: true, createdAt: true, lastUsedAt: true, revokedAt: true, user: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title="API keys"
        subtitle={<>Keys for the blog publishing API at <code className="text-asphalt">{site.url}/api/blog-api/v1</code>. A key acts as you, can only work on the blog, and can be revoked at any time.</>}
      />
      <Notice saved={sp.saved} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Your keys">
          {keys.length === 0 ? (
            <p className="text-sm text-road">No keys yet.</p>
          ) : (
            <div className="-mx-5 -my-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
                  <tr>{["Name", "Key", "Can publish", "Last used", "Status", ""].map((h) => <th key={h} scope="col" className="px-5 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#EEF0F3]">
                  {keys.map((k) => (
                    <tr key={k.id} className={k.revokedAt ? "text-road/60" : ""}>
                      <td className="px-5 py-3 font-semibold">{k.name}{me.role === "owner" && <span className="block text-xs font-normal text-road">{k.user.name}</span>}</td>
                      <td className="px-5 py-3 font-mono text-xs">{k.prefix}…</td>
                      <td className="px-5 py-3">{k.canPublish ? "Yes" : "Drafts only"}</td>
                      <td className="px-5 py-3">{k.lastUsedAt ? dateTime(k.lastUsedAt) : "Never"}</td>
                      <td className="px-5 py-3">{k.revokedAt ? `Revoked ${dateTime(k.revokedAt)}` : <span className="font-semibold text-emerald-700">Active</span>}</td>
                      <td className="px-5 py-3 text-right">
                        {!k.revokedAt && (
                          <form action={revokeKey}>
                            <input type="hidden" name="id" value={k.id} />
                            <button className="font-semibold text-red-600 hover:underline">Revoke</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Create a key">
          <NewKeyForm />
        </Card>
      </div>
    </>
  );
}
