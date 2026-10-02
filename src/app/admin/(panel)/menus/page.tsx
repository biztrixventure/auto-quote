import { requireAdmin } from "@/lib/admin-guard";
import { linkOptions } from "@/lib/menus";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { MenuBuilder } from "./MenuBuilder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menus" };

export default async function MenusPage() {
  await requireAdmin("admin");
  const [{ navigation }, options] = await Promise.all([getSettings(), linkOptions()]);
  return (
    <>
      <PageHeader title="Menus" subtitle="The header menu (with dropdowns), footer links, header button and announcement bar." />
      <MenuBuilder initial={navigation} options={options} />
    </>
  );
}
