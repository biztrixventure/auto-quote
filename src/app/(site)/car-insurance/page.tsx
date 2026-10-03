import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, QuoteBanner } from "@/components/sections";
import { db } from "@/lib/db";
import { ogMetadata } from "@/lib/og";
import { jsonLd } from "@/lib/security";
import { site } from "@/lib/site";
import { guidePath, limitsShort } from "@/lib/state-guides";

const title = "Car Insurance Requirements by State";
const description = "Minimum car insurance required in every US state, which states are no-fault, and what coverage is worth adding. Pick your state for a full guide.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/car-insurance" },
  ...ogMetadata({ eyebrow: "Car insurance", title, subtitle: description }, { url: "/car-insurance", title: `${title} | ${site.name}`, description }),
};

export default async function StatesIndexPage() {
  const guides = await db.stateGuide.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: { name: true, slug: true, code: true, biPerPerson: true, biPerAccident: true, pd: true, noFault: true },
  });
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: guides.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: `${g.name} car insurance requirements`, url: `${site.url}${guidePath(g)}` })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PageHero eyebrow="Car insurance by state" title={title} intro={description} crumbs={[{ name: "Car insurance by state", href: "/car-insurance" }]} />
      <section className="mx-auto max-w-6xl px-5 py-12">
        {guides.length === 0 ? (
          <p className="rounded-2xl bg-[#F7F9FC] px-6 py-12 text-center text-road">State guides are coming soon.</p>
        ) : (
          <>
            <p className="max-w-3xl leading-relaxed text-road">
              Every state sets its own minimum car insurance. Most require liability coverage, written as three numbers such as <strong className="text-asphalt">30/60/25</strong>: thousands of
              dollars for injuries per person, injuries per accident, and property damage. A few states are <strong className="text-asphalt">no-fault</strong> and also require personal injury protection (PIP).
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <li key={g.code}>
                  <Link href={guidePath(g)} className="group flex items-center justify-between gap-3 rounded-2xl bg-[#F7F9FC] px-5 py-4 transition hover:bg-[#EEF4FC]">
                    <span>
                      <span className="block font-bold text-asphalt group-hover:text-sky">{g.name}</span>
                      <span className="text-sm text-road">
                        {limitsShort(g) ? `Minimum ${limitsShort(g)}` : "See requirements"}
                        {g.noFault && " · No-fault"}
                      </span>
                    </span>
                    <span aria-hidden className="text-road transition group-hover:translate-x-0.5 group-hover:text-sky">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <QuoteBanner />
    </>
  );
}
