import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSite } from "@/lib/settings";

// Overrides the site-wide "index, follow" so every robots tag on a 404 says noindex.
export const metadata = { title: "Page not found", description: "This page doesn't exist or has moved.", robots: { index: false, follow: true } };

const links = [
  { href: "/#repair-costs", label: "Repair costs", text: "See what common repairs cost." },
  { href: "/#why-choose", label: "Why choose us", text: "Our vehicle service contracts." },
  { href: "/#faq", label: "Questions", text: "Answers to common questions." },
];

// Shown for any unknown URL. It sits outside the (site) layout, so it adds the header and footer itself.
export default async function NotFound() {
  const site = await getSite();
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">Error 404</p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Looks like this road is closed.</h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-road">
                The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back on track.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/" className="btn-primary bg-line text-asphalt hover:bg-[#E3B21F]">
                  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
                  Back to home
                </Link>
                <Link href="/quote/vehicle-protection" className="btn-secondary">Get a free quote</Link>
              </div>
              <p className="mt-6 text-sm text-road">
                Need help now? Call our team at{" "}
                <a href={site.phoneHref} className="font-semibold text-sky hover:underline">{site.phone}</a>.
              </p>
            </div>

            {/* Road illustration: a big 404 on an asphalt road with a closed-lane barrier. */}
            <div aria-hidden className="relative mx-auto w-full max-w-md">
              <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,#2B3038_0%,#16181C_100%)] px-8 pb-10 pt-12 shadow-[0_30px_60px_-30px_rgba(16,24,40,0.6)]">
                <p className="text-center text-[7rem] font-black leading-none tracking-tight text-white sm:text-[8.5rem]">
                  4<span className="text-line">0</span>4
                </p>
                <div className="mx-auto mt-6 flex w-4/5 items-center justify-center gap-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i} className={`h-4 flex-1 rounded-sm ${i % 2 ? "bg-white" : "bg-[#FF7A00]"}`} />
                  ))}
                </div>
                <div className="mx-auto mt-1 flex w-3/5 justify-between">
                  <span className="h-8 w-2 rounded-b bg-white/70" />
                  <span className="h-8 w-2 rounded-b bg-white/70" />
                </div>
                <div className="lane absolute inset-x-0 bottom-0 h-2" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-road/70">Popular pages</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="group block rounded-xl border border-rail p-5 transition hover:border-sky hover:shadow-[0_10px_30px_-15px_rgba(31,95,173,0.35)]">
                  <span className="flex items-center justify-between font-bold">
                    {l.label}
                    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-road transition group-hover:translate-x-0.5 group-hover:text-sky"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </span>
                  <span className="mt-1 block text-sm text-road">{l.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
