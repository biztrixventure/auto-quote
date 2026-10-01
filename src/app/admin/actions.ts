"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { destroySession, getSession } from "@/lib/auth";

export async function signOut() {
  const session = await getSession();
  await destroySession();
  if (session) await audit(session.user.email, "signed_out", "user", session.userId);
  redirect("/admin/login");
}
