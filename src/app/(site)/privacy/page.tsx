import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";
import { fillLegal, getLegal } from "@/lib/legal";
import { ogMetadata } from "@/lib/og";
import { site } from "@/lib/site";

const description = `How ${site.name} uses, shares and protects your information when you request car insurance or service contract quotes, your rights, and how to opt out.`;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description,
  alternates: { canonical: "/privacy" },
  ...ogMetadata({ eyebrow: "Legal", title: "Privacy Policy", subtitle: "How we collect, use and protect your information, and the choices you have." }, { url: "/privacy", title: `Privacy Policy | ${site.name}`, description }),
};

export default async function PrivacyPage() {
  const { legal, vars } = await getLegal();
  return <LegalDoc title="Privacy Policy" path="/privacy" html={fillLegal(legal.privacyHtml, vars)} updated={legal.privacyUpdated} description={description} />;
}
