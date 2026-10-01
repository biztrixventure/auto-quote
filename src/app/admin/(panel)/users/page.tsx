import { ROLES, type Role } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { Card, PageHeader, timeAgo } from "@/components/admin/ui";
import { resetUserTwoFactor, toggleUserActive, updateUser } from "./actions";
import { CreateUserForm, ResetPasswordButton } from "./UserForms";

export const dynamic = "force-dynamic";

const ROLE_HELP: Record<Role, string> = {
  agent: "Dashboard and leads: notes, tasks and status changes.",
  admin: "Everything except managing users.",
  owner: "Everything, including users.",
};

export default async function UsersPage() {
  const me = await requireAdmin("owner");
  const users = await db.adminUser.findMany({
    orderBy: [{ active: "desc" }, { role: "desc" }, { name: "asc" }],
    include: { _count: { select: { leads: true } } },
  });
  const roles = Object.entries(ROLES) as [Role, string][];

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who can sign in to the admin, and what they're allowed to do." />

      <Card title="Add a user">
        <CreateUserForm roles={roles} />
        <ul className="mt-4 grid gap-2 text-xs text-road sm:grid-cols-3">
          {roles.map(([k, l]) => (
            <li key={k}><strong className="text-asphalt">{l}:</strong> {ROLE_HELP[k]}</li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wide text-road">
            <tr>
              {["User", "Role", "Two-factor", "Last sign-in", "Leads", "Status", "Actions"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF0F3]">
            {users.map((u) => {
              const self = u.id === me.id;
              return (
                <tr key={u.id} className={`align-top ${u.active ? "" : "bg-[#FCFCFD] text-road"}`}>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{u.name}</span>
                    {self && <span className="ml-2 rounded-full bg-sky/10 px-2 py-0.5 text-xs font-semibold text-sky">You</span>}
                    <span className="block text-xs text-road">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {self ? (
                      ROLES[u.role as Role] ?? u.role
                    ) : (
                      <form action={updateUser} className="flex gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <select name="role" defaultValue={u.role} aria-label={`Role for ${u.name}`} className="h-8 rounded-md border border-[#D0D5DD] bg-white px-2 text-sm">
                          {roles.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                        <button className="rounded-md border border-[#D0D5DD] px-2 text-xs font-semibold hover:bg-[#F9FAFB]">Save</button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.totpEnabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                      {u.totpEnabled ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3 tabular-nums">{u._count.leads}</td>
                  <td className="px-4 py-3">{u.active ? "Active" : "Deactivated"}</td>
                  <td className="space-y-2 px-4 py-3">
                    {!self && (
                      <>
                        <ResetPasswordButton id={u.id} name={u.name} />
                        {u.totpEnabled && (
                          <form action={resetUserTwoFactor}>
                            <input type="hidden" name="id" value={u.id} />
                            <button className="text-sm font-semibold text-sky hover:underline">Reset two-factor</button>
                          </form>
                        )}
                        <form action={toggleUserActive}>
                          <input type="hidden" name="id" value={u.id} />
                          <button className={`text-sm font-semibold hover:underline ${u.active ? "text-red-600" : "text-emerald-700"}`}>
                            {u.active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-road">Deactivated users can&apos;t sign in and are signed out immediately. Their notes and history are kept.</p>
    </>
  );
}
