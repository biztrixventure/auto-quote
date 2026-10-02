import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { DEFAULT_PRIVACY_HTML, DEFAULT_TERMS_HTML } from "@/lib/legal-templates";
import { getSettings, getSite } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { LegalEditor } from "./LegalEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Legal & privacy" };

export default async function LegalPage() {
  await requireAdmin("admin");
  const [{ legal }, biz] = await Promise.all([getSettings(), getSite()]);
  return (
    <>
      <PageHeader
        title="Legal & privacy"
        subtitle={<>Your Privacy Policy, Terms of Use and how opt-outs work. Requests from visitors arrive in <Link href="/admin/privacy#requests" className="font-semibold text-sky hover:underline">Privacy</Link>.</>}
      />
      <LegalEditor initial={legal} templates={{ privacy: DEFAULT_PRIVACY_HTML, terms: DEFAULT_TERMS_HTML }} defaults={{ email: biz.email, phone: biz.phone }} />
    </>
  );
}
