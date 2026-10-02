import { requireAdmin } from "@/lib/admin-guard";
import { site } from "@/lib/site";
import { PageEditor } from "../PageEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "New page" };

export default async function NewPage() {
  await requireAdmin("admin");
  return (
    <PageEditor
      siteUrl={site.url}
      page={{ title: "", slug: "", intro: "", content: "", status: "draft", layout: "standard", showQuoteCta: true, coverImageId: null, coverAlt: "", seoTitle: "", seoDescription: "", noindex: false }}
    />
  );
}
