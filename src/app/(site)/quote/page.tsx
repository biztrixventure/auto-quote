import Link from "next/link";
import { PageHero } from "@/components/sections";
import { ogMetadata } from "@/lib/og";
import { PRODUCTS, VSC_DISCLOSURE } from "@/lib/products";
import { site } from "@/lib/site";

export const metadata = {
  title: "Get a Free Quote",
  description: "Choose your free quote: compare car insurance prices from several companies, or get a price on a vehicle service contract for costly repairs.",
  alternates: { canonical: "/quote" },
  ...ogMetadata(
    { eyebrow: "Free quote", title: "Which quote do you need?", subtitle: "Car insurance or a vehicle service contract." },
    { url: "/quote", title: `Get a Free Quote | ${site.name}` },
  ),
};

const CHOICES = [
  {
    eyebrow: PRODUCTS.auto.label,
    title: "Compare car insurance quotes",
    body: "Pays for damage and injuries after an accident. Most states require it. Our team helps you get quotes from insurance companies that cover your area.",
    points: ["Required by law in most states", "About 5 minutes", "Real people help by phone"],
    href: PRODUCTS.auto.quoteHref,
    cta: "Start car insurance quote",
  },
  {
    eyebrow: PRODUCTS.vsc.label,
    title: "Get help with repair bills",
    body: "Optional. Pays for repairs when a part listed in the contract breaks down, such as the engine or transmission, after the factory warranty ends.",
    points: ["Not insurance", "We explain your options", "Connected with an authorized provider"],
    href: PRODUCTS.vsc.quoteHref,
    cta: "Start service contract quote",
  },
];

export default function QuoteChooserPage() {
  return (
    <>
      <PageHero title="Which quote do you need?" intro="We offer two separate products. Pick the one you're looking for; you can always come back for the other." crumbs={[{ name: "Get a quote", href: "/quote" }]} />
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-2">
        {CHOICES.map((c) => (
          <div key={c.href} className="flex flex-col rounded-2xl border border-rail bg-white p-7 shadow-[0_20px_50px_-30px_rgba(38,42,48,0.25)]">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">{c.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-extrabold">{c.title}</h2>
            <p className="mt-3 leading-relaxed text-road">{c.body}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {c.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-sky/10 text-sky">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <Link href={c.href} className="btn-primary mt-7 inline-flex justify-center bg-line text-asphalt hover:bg-[#E3B21F]">{c.cta}</Link>
          </div>
        ))}
      </section>
      <p className="mx-auto max-w-6xl px-5 pb-12 text-xs leading-relaxed text-road">{VSC_DISCLOSURE}</p>
    </>
  );
}
