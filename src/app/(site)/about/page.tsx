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
const description = `Who ${site.name} is, the two separate services we offer (car insurance quotes and vehicle service contracts), how we research our guides and how we are paid.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  ...ogMetadata({ eyebrow: "About us", title, subtitle: description }, { url: "/about", title: `${title} | ${site.name}`, description }),
};

// Only facts the site can stand behind: what it does, how content is made, how it is paid,
// and how to reach the business (from Settings). No invented history, team or awards.
export default async function AboutPage() {
  const [biz, states, posts] = await Promise.all([getSite(), db.stateGuide.count({ where: { published: true } }), db.post.count({ where: livePosts() })]);
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
      <PageHero eyebrow="About us" title={title} intro={`${site.name} helps US drivers compare car insurance quotes and get quotes on vehicle service contracts, with plain-English guides to both.`} crumbs={[{ name: "About", href: "/about" }]} />
      <section className="mx-auto max-w-3xl px-5 py-12">
        <div className="post-content">
          <h2>What we do</h2>
          <p>
            {site.name} is a <strong>licensed insurance agency</strong> that also offers vehicle service contracts. When you request a{" "}
            <Link href="/quote/auto">car insurance quote</Link>, our licensed agents compare quotes from the insurance companies we work with and help you choose
            the coverage that fits. When you request a <Link href="/quote/vehicle-protection">vehicle service contract quote</Link>, our team shows you plan options
            and prices from the service contract providers we partner with. You can buy through us, and the policy or contract is issued by the company you choose.
          </p>
          <p>
            Car insurance and vehicle service contracts are two different products, and we always explain the difference: insurance pays for damage after an
            accident, theft or weather, while a vehicle service contract is not insurance and may pay for eligible repairs when listed parts break down. You
            choose what you want, and there is never an obligation to buy.
          </p>

          <h2>How we create our guides</h2>
          <p>
            Our <Link href="/car-insurance">car insurance requirements by state</Link> ({states} state guides) and our <Link href="/blog">blog</Link> ({posts} {posts === 1 ? "article" : "articles"}) are
            written by the {site.name} team. We base factual claims on official and established sources, such as state laws and insurance departments, the
            Federal Trade Commission and recognized consumer organizations, and we link to those sources so you can check them.
          </p>
          <p>
            Each state guide shows the date its requirements were last checked against the official source. Laws and prices change, so we review our content
            regularly and update it when they do. If you spot something that looks wrong or out of date, email us at{" "}
            <a href={`mailto:${biz.email}`}>{biz.email}</a> and we will check it.
          </p>

          <h2>How we are paid</h2>
          <p>
            Our quotes and guides are free to use. We are paid commissions by the insurance companies and service contract providers we work with when you buy a
            policy or plan through us. That never changes what our guides say about the law or how these products work, and our{" "}
            <Link href="/privacy">Privacy Policy</Link> explains how your information is used and how to <Link href="/do-not-sell">opt out of its sale or sharing</Link>.
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
