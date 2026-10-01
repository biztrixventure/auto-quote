import { ogMetadata } from "@/lib/og";
import { site } from "@/lib/site";
export const metadata = {
  title: "Terms of Use",
  description: `The terms that apply when you use the ${site.name} website to compare car insurance quotes and request help from a licensed agent.`,
  alternates: { canonical: "/terms" },
  ...ogMetadata({ eyebrow: "Legal", title: "Terms of Use", subtitle: "The terms that apply when you use our website to compare car insurance quotes." }, { url: "/terms", title: `Terms of Use | ${site.name}` }),
};

export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-bold">Terms of use</h1>
      <p className="mt-4 rounded-md border-l-4 border-line bg-mist p-4 text-road">
        Placeholder. Replace with the terms of use provided by the agency&apos;s attorney.
      </p>
    </article>
  );
}
