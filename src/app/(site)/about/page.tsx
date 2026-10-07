import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/sections";
import { db } from "@/lib/db";
import { livePosts } from "@/lib/blog";
import { ogMetadata } from "@/lib/og";
import { jsonLd } from "@/lib/security";
import { getSite } from "@/lib/settings";
import { site } from "@/lib/site";

const title = `About ${site.name}`;
const description = `Who ${site.name} is, the vehicle service contracts (extended car warranties) we offer, how we research our guides and how we are paid.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  ...ogMetadata({ eyebrow: "About us", title, subtitle: description }, { url: "/about", title: `${title} | ${site.name}`, description }),
};

// Only facts the site can stand behind: what it does, how content is made, how it is paid,
// and how to reach the business (from Settings). No invented history, team or awards.
export default async function AboutPage() {
  const [biz, posts] = await Promise.all([getSite(), db.post.count({ where: livePosts() })]);
  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${site.url}/about#webpage`,
    url: `${site.url}/about`,
    name: title,
    description,
    about: { "@id": `${site.url}/#organization` },
    publisher: { "@id": `${site.url}/#organization` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PageHero
        eyebrow="About us"
        title={title}
        intro={`${site.name} helps US drivers protect their budget from costly car repairs with vehicle service contracts, often called extended car warranties, and plain-English guides to how they work.`}
        crumbs={[{ name: "About", href: "/about" }]}
      />
      <section className="mx-auto max-w-3xl px-5 py-12">
        <div className="post-content">
          <h2>What we do</h2>
          <p>
            {site.name} offers <strong>vehicle service contracts</strong>, often called extended car warranties. When you{" "}
            <Link href="/quote/vehicle-protection">request a quote</Link>, you see estimated prices for the plans your car qualifies for, from powertrain to
            complete protection, and our team helps you choose. Each contract is backed and administered by an established provider, which handles claims under
            the contract&apos;s terms.
          </p>
          <p>
            A vehicle service contract is not insurance. Car insurance pays for damage after an accident, theft or weather; a service contract may pay for
            eligible repairs when the parts it lists break down. We explain exactly what each plan includes and excludes, every plan comes with a 30-day
            money-back guarantee, and there is never an obligation to buy.
          </p>

          <h2>How we create our guides</h2>
          <p>
            Our <Link href="/blog">blog</Link> ({posts} {posts === 1 ? "article" : "articles"}) and our <Link href="/repair-costs">car repair cost guide</Link> are
            written by the {site.name} team. We base factual claims on established sources, such as the Federal Trade Commission, repair-cost studies and
            recognized consumer organizations, and we link to those sources so you can check them.
          </p>
          <p>
            Prices and plans change, so we review our content regularly and update it when they do. If you spot something that looks wrong or out of date,
            email us at <a href={`mailto:${biz.email}`}>{biz.email}</a> and we will check it.
          </p>

          <h2>How we are paid</h2>
          <p>
            Our quotes and guides are free to use. We earn money when you buy a vehicle service contract through us. That never changes what our guides say about
            how these contracts work, and our <Link href="/privacy">Privacy Policy</Link> explains how your information is used and how to{" "}
            <Link href="/do-not-sell">opt out of its sale or sharing</Link>.
          </p>

          <h2>Contact us</h2>
          <p>
            Email <a href={`mailto:${biz.email}`}>{biz.email}</a> or call <a href={biz.phoneHref}>{biz.phone}</a>. You can also read our <Link href="/terms">Terms of Use</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
