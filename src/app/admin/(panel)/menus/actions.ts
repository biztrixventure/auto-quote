"use server";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-guard";
import { cleanNavigation } from "@/lib/menus";
import { saveSetting } from "@/lib/settings";

export async function saveMenus(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const me = await requireAdmin("admin");
  const r = cleanNavigation(input);
  if (!r.ok) return { ok: false, error: r.error };
  await saveSetting("navigation", r.nav);
  await audit(me.email, "menus_updated", "setting", "navigation");
  return { ok: true };
}
