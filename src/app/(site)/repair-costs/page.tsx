import type { Metadata } from "next";
import { PageHero, QuoteBanner, RepairCostsSection } from "@/components/sections";
import { ogMetadata } from "@/lib/og";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";

const title = "Car Repair Costs";
const description = "See what common car repairs cost out of pocket, from alternators to transmissions, and how a vehicle service contract can help protect your budget.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/repair-costs" },
  ...ogMetadata({ eyebrow: "Repair costs", title: "What would your next repair cost?", subtitle: description }, { url: "/repair-costs", title: `${title} | ${site.name}`, description }),
};

export default async function RepairCostsPage() {
  const { content } = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Repair costs"
        title="What Would Your Next Repair Cost?"
        intro="Select any part of the car below to see what a typical repair costs out of pocket, without a vehicle service contract."
        crumbs={[{ name: "Repair costs", href: "/repair-costs" }]}
      />
      <RepairCostsSection costs={content.repairCosts} bare />
      <QuoteBanner product="vsc" />
    </>
  );
}
