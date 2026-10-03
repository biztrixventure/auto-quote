import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";
import { fillLegal, getLegal } from "@/lib/legal";
import { ogMetadata } from "@/lib/og";
import { site } from "@/lib/site";

const description = `The terms that apply when you use ${site.name} to compare car insurance quotes or request a vehicle service contract quote.`;

export const metadata: Metadata = {
  title: "Terms of Use",
  description,
  alternates: { canonical: "/terms" },
  ...ogMetadata({ eyebrow: "Legal", title: "Terms of Use", subtitle: "The terms that apply when you use our website for car insurance or service contract quotes." }, { url: "/terms", title: `Terms of Use | ${site.name}`, description }),
};

export default async function TermsPage() {
  const { legal, vars } = await getLegal();
  return <LegalDoc title="Terms of Use" path="/terms" html={fillLegal(legal.termsHtml, vars)} updated={legal.termsUpdated} description={description} />;
}
