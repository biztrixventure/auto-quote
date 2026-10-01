import { ogMetadata } from "@/lib/og";
import { site } from "@/lib/site";
export const metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects the information you share when you request car insurance quotes, and the choices you have.`,
  alternates: { canonical: "/privacy" },
  ...ogMetadata({ eyebrow: "Legal", title: "Privacy Policy", subtitle: "How we collect, use and protect your information, and the choices you have." }, { url: "/privacy", title: `Privacy Policy | ${site.name}` }),
};

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-bold">Privacy policy</h1>
      <p className="mt-4 rounded-md border-l-4 border-line bg-mist p-4 text-road">
        Placeholder. Replace with the privacy policy provided by the agency&apos;s attorney. It must cover GLBA,
        CCPA/CPRA and other state privacy laws, and how data is shared with insurance companies and partners.
      </p>
      <h2 id="do-not-sell" className="mt-10 text-xl font-bold">Do not sell or share my personal information</h2>
      <p className="mt-2 text-road">Placeholder for the opt-out process required by California and other states.</p>
    </article>
  );
}
