import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyRequestForm } from "@/components/PrivacyRequestForm";
import { PageHero } from "@/components/sections";
import { getLegal } from "@/lib/legal";
import { ogMetadata } from "@/lib/og";
import { site } from "@/lib/site";

const title = "Do Not Sell or Share My Personal Information";
const description = `Opt out of the sale or sharing of your personal information, stop calls and texts, or ask ${site.name} to access, delete or correct your data.`;

export const metadata: Metadata = {
  title: "Your Privacy Choices: Do Not Sell or Share My Personal Information",
  description,
  alternates: { canonical: "/do-not-sell" },
  ...ogMetadata({ eyebrow: "Your privacy choices", title, subtitle: description }, { url: "/do-not-sell", title: `${title} | ${site.name}`, description }),
};

export default async function DoNotSellPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ legal, vars }, sp] = await Promise.all([getLegal(), searchParams]);
  return (
    <>
      <PageHero
        eyebrow="Your privacy choices"
        title={title}
        intro={`You're in control of your information. Use this form to opt out of the sale or sharing of your personal information, stop marketing calls and texts, or ask for a copy, correction or deletion of your data.`}
        crumbs={[{ name: "Privacy Policy", href: "/privacy" }, { name: "Your privacy choices", href: "/do-not-sell" }]}
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div className="rounded-[28px] bg-[linear-gradient(155deg,#E8F0FB_0%,#F7F9FC_50%,#FFF6DA_100%)] p-2.5">
          <div className="rounded-[22px] bg-white p-6 shadow-[0_10px_30px_rgba(31,95,173,0.08)] sm:p-8">
            <PrivacyRequestForm initialType={sp.type} phone={vars.privacy_phone} />
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl bg-[#F7F9FC] p-6">
            <h2 className="text-lg font-bold text-asphalt">What happens next</h2>
            <ol className="mt-4 space-y-4 text-[15px] leading-relaxed text-road">
              <li><strong className="text-asphalt">Opt-outs</strong> take effect right away. No account or proof needed.</li>
              <li><strong className="text-asphalt">Access, deletion and correction</strong>: we match your details with what we hold to confirm it&apos;s you, then respond within {legal.responseDays} days.</li>
              <li>You&apos;ll get a reference number now{legal.confirmByEmail ? " and a confirmation email" : ""}. Using your rights never affects the price or service you get.</li>
            </ol>
          </section>

          <section className="rounded-3xl bg-[#F7F9FC] p-6">
            <h2 className="text-lg font-bold text-asphalt">Global Privacy Control</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-road">
              {legal.honorGpc
                ? "If your browser or extension sends a Global Privacy Control (GPC) signal, we automatically treat it as a request to opt out of the sale and sharing of your information for that browser."
                : "You can also opt out using this form at any time."}
            </p>
          </section>

          <section className="rounded-3xl bg-[#F7F9FC] p-6">
            <h2 className="text-lg font-bold text-asphalt">Other ways to reach us</h2>
            <ul className="mt-3 space-y-2 text-[15px] text-road">
              <li>Email: <a href={`mailto:${vars.privacy_email}`} className="font-semibold text-sky hover:underline">{vars.privacy_email}</a></li>
              <li>Phone: <span className="font-semibold text-asphalt">{vars.privacy_phone}</span></li>
              <li>Texts: reply <strong className="text-asphalt">STOP</strong> to any message</li>
            </ul>
            <p className="mt-4 text-sm text-road">
              Read our <Link href="/privacy" className="font-semibold text-sky hover:underline">Privacy Policy</Link> to learn what we collect and how we use it.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
