import { notFound, redirect } from "next/navigation";
import { getSession, hasRole, type Role } from "./auth";

/**
 * Checks the signed-in admin on every admin page, action and API route (server actions
 * are reachable as public endpoints, so the middleware alone is not enough).
 * - Not signed in, or 2FA not completed: sent to the login page.
 * - Signed in without the required role: plain 404.
 * Returns the signed-in user.
 */
export async function requireAdmin(minRole: Role = "agent") {
  const session = await getSession();
  if (!session || session.mfaPending) redirect("/admin/login");
  if (!hasRole(session.user, minRole)) notFound();
  return session.user;
}
