import type { Metadata } from "next";
import { FaqSection, PageHero, QuoteBanner } from "@/components/sections";
import { ogMetadata } from "@/lib/og";
import { fillCompany, getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

const title = "Vehicle Service Contract FAQ";
const description = "Answers to common questions about vehicle service contracts (often called extended car warranties): what's included, when you can buy one and how it differs from car insurance.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  ...ogMetadata({ eyebrow: "FAQ", title, subtitle: description }, { url: "/faq", title: `${title} | ${site.name}`, description }),
};

export default async function FaqPage() {
  const [{ content }, biz] = await Promise.all([getSettings(), getSite()]);
  const faqs = content.faqs.map((f, i) => ({ q: fillCompany(f.q), a: fillCompany(f.a), call: i === 0 }));
  return (
    <>
      <PageHero eyebrow="FAQ" title={title} intro="Quick answers about vehicle service contracts: what they include, what they cost and how they work. For car insurance questions, see our state guides." crumbs={[{ name: "FAQ", href: "/faq" }]} />
      <FaqSection faqs={faqs} phone={biz.phone} phoneHref={biz.phoneHref} bare withSchema />
      <QuoteBanner product="vsc" />
    </>
  );
}
