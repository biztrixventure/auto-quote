"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { hashPassword, randomPassword, ROLES } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export type UserFormState = { ok?: string; error?: string; tempPassword?: string; forEmail?: string };

const roleSchema = z.enum(Object.keys(ROLES) as [keyof typeof ROLES, ...(keyof typeof ROLES)[]]);
const done = () => revalidatePath("/admin/users");

async function ownersLeft(excludingId: string) {
  return db.adminUser.count({ where: { role: "owner", active: true, NOT: { id: excludingId } } });
}

export async function createUser(_: UserFormState, f: FormData): Promise<UserFormState> {
  const me = await requireAdmin("owner");
  const parsed = z
    .object({ name: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email().max(200), role: roleSchema })
    .safeParse(Object.fromEntries(f));
  if (!parsed.success) return { error: "Enter a name, a valid email and a role." };
  const { name, email, role } = parsed.data;
  if (await db.adminUser.findUnique({ where: { email } })) return { error: "Someone with that email already has an account." };
  const tempPassword = randomPassword();
  const user = await db.adminUser.create({ data: { name, email, role, passwordHash: await hashPassword(tempPassword) } });
  await audit(me.email, "user_created", "user", user.id, { email, role });
  done();
  return { ok: `${name} can now sign in.`, tempPassword, forEmail: email };
}

export async function resetUserPassword(_: UserFormState, f: FormData): Promise<UserFormState> {
  const me = await requireAdmin("owner");
  const user = await db.adminUser.findUnique({ where: { id: String(f.get("id") ?? "") } });
  if (!user) return { error: "User not found." };
  const tempPassword = randomPassword();
  await db.$transaction([
    db.adminUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(tempPassword) } }),
    db.adminSession.deleteMany({ where: { userId: user.id } }),
  ]);
  await audit(me.email, "user_password_reset", "user", user.id, { email: user.email });
  return { ok: "Password reset. They've been signed out everywhere.", tempPassword, forEmail: user.email };
}

export async function updateUser(f: FormData) {
  const me = await requireAdmin("owner");
  const id = String(f.get("id") ?? "");
  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user) return;
  const role = roleSchema.safeParse(f.get("role"));
  if (!role.success || role.data === user.role) return;
  // Owners can't demote themselves, and there must always be an active owner.
  if (user.id === me.id || (user.role === "owner" && (await ownersLeft(user.id)) === 0)) return;
  await db.adminUser.update({ where: { id }, data: { role: role.data } });
  await audit(me.email, "user_role_changed", "user", id, { email: user.email, from: user.role, to: role.data });
  done();
}

export async function toggleUserActive(f: FormData) {
  const me = await requireAdmin("owner");
  const id = String(f.get("id") ?? "");
  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user || user.id === me.id) return;
  if (user.active && user.role === "owner" && (await ownersLeft(user.id)) === 0) return;
  await db.$transaction([
    db.adminUser.update({ where: { id }, data: { active: !user.active } }),
    ...(user.active ? [db.adminSession.deleteMany({ where: { userId: id } })] : []),
  ]);
  await audit(me.email, user.active ? "user_deactivated" : "user_reactivated", "user", id, { email: user.email });
  done();
}

export async function resetUserTwoFactor(f: FormData) {
  const me = await requireAdmin("owner");
  const id = String(f.get("id") ?? "");
  const user = await db.adminUser.findUnique({ where: { id } });
  if (!user || !user.totpEnabled) return;
  await db.$transaction([
    db.adminUser.update({ where: { id }, data: { totpEnabled: false, totpSecret: null } }),
    db.adminSession.deleteMany({ where: { userId: id } }),
  ]);
  await audit(me.email, "user_2fa_reset", "user", id, { email: user.email });
  done();
}
