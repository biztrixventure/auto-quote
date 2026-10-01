import { CustomerReviews } from "@/components/CustomerReviews";
import { DeferredImg } from "@/components/DeferredImg";
import { RepairCostDiagram } from "@/components/RepairCostDiagram";
import { Reveal } from "@/components/Reveal";
import { WhyChooseCarousel } from "@/components/WhyChooseCarousel";
import { ZipStart } from "@/components/ZipStart";
import { jsonLd } from "@/lib/security";
import { fillCompany, getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

export default async function Home() {
  const [{ content }, biz] = await Promise.all([getSettings(), getSite()]);
  // Editable in /admin/content. "{company}" becomes the business name.
  const faqs = content.faqs.map((f, i) => ({ q: fillCompany(f.q), a: fillCompany(f.a), call: i === 0 }));
  const reasons = content.reasons.map((r) => ({ title: fillCompany(r.title), body: fillCompany(r.body) }));
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <section className="relative isolate min-h-[590px] overflow-hidden bg-asphalt text-white sm:min-h-[620px]">
        {/* Self-hosted, pre-sized hero photos. Only the first loads straight away; the
            other two fade in after 10s and 20s, so they wait until the page has loaded. */}
        <img
          src="/images/hero/hero-1-1600.webp"
          srcSet="/images/hero/hero-1-640.webp 640w, /images/hero/hero-1-1024.webp 1024w, /images/hero/hero-1-1600.webp 1600w, /images/hero/hero-1-2048.webp 2048w"
          sizes="100vw"
          fetchPriority="high"
          decoding="async"
          alt=""
          aria-hidden="true"
          className="hero-scene hero-scene--one object-[58%_55%]"
        />
        <DeferredImg
          src="/images/hero/hero-2-1600.webp"
          srcSet="/images/hero/hero-2-640.webp 640w, /images/hero/hero-2-1024.webp 1024w, /images/hero/hero-2-1600.webp 1600w, /images/hero/hero-2-2048.webp 2048w"
          sizes="100vw"
          decoding="async"
          aria-hidden="true"
          className="hero-scene hero-scene--two object-[58%_55%]"
        />
        <DeferredImg
          src="/images/hero/hero-3-1600.webp"
          srcSet="/images/hero/hero-3-640.webp 640w, /images/hero/hero-3-1024.webp 1024w, /images/hero/hero-3-1600.webp 1600w, /images/hero/hero-3-2048.webp 2048w"
          sizes="100vw"
          decoding="async"
          aria-hidden="true"
          className="hero-scene hero-scene--three object-[58%_55%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-asphalt/65" />
        <div className="mx-auto flex min-h-[590px] max-w-6xl items-center px-5 py-16 sm:min-h-[620px] md:py-20">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.14em] text-line">{fillCompany(content.hero.eyebrow)}</p>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.08] sm:text-5xl md:text-[3.75rem]">
              {fillCompany(content.hero.title)}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/85">
              {fillCompany(content.hero.subtitle)}
            </p>
            <div className="mt-8 max-w-md">
              <ZipStart dark />
              <p className="mt-3 text-sm text-white/75">Free to compare. No obligation to buy.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/90">
              <span>Licensed in all 50 states</span>
              <span>Secure, private quote request</span>
            </div>
          </div>
        </div>
        <div aria-hidden className="lane h-2.5 w-full" />
      </section>

      <section id="repair-costs" className="scroll-mt-6 bg-white text-asphalt">
        <div className="mx-auto max-w-6xl px-5 py-14 text-center md:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
              What Would Your Next Repair Cost?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-road">
              Select any part of the car below to see what a typical repair costs without coverage.
            </p>
          </div>
          <RepairCostDiagram costs={content.repairCosts} />
          <p className="mx-auto mt-6 max-w-4xl text-xs leading-relaxed text-road/80 sm:text-sm">
            Estimated auto repair costs based on ConsumerAffairs data (
            <a href="https://www.consumeraffairs.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-sky">
              www.consumeraffairs.com
            </a>
            ). Costs shown are estimates only and may vary by vehicle, location, and repair facility. Coverage and benefits are subject to plan terms, conditions, and exclusions.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 text-center md:grid-cols-[1fr_1.15fr] md:gap-12 md:py-16 md:text-left">
          <Reveal className="md:order-1">
            <h2 className="mx-auto max-w-md text-3xl font-extrabold leading-tight sm:text-4xl md:mx-0">
              Could You Afford A $3,000 Auto Repair Bill Today?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-road md:mx-0">
              A vehicle service contract through {site.name} protects you from expensive car repair surprises.
            </p>
            <p className="mt-4 text-sm text-road/80">*A deductible may apply.</p>
            <a href="/quote/auto" className="btn-primary mt-7 inline-flex bg-line uppercase tracking-wide text-asphalt hover:bg-[#E3B21F]">
              Get a free quote
            </a>
          </Reveal>
          <Reveal from="pop" delay={150} className="order-first md:order-2">
            <img
              src="/images/cta-car.webp"
              alt=""
              aria-hidden="true"
              width={1200}
              height={831}
              loading="lazy"
              decoding="async"
              className="mx-auto block h-auto w-full max-w-md md:max-w-none"
            />
          </Reveal>
        </div>
      </section>

      <section className="bg-white px-5 pb-14 pt-6 md:pb-20 md:pt-24">
        <div className="relative mx-auto grid max-w-6xl items-center gap-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#0B2F5B_0%,#1F5FAD_55%,#3D8FDB_100%)] px-6 pb-10 pt-8 text-center text-white md:grid-cols-[0.9fr_1.1fr] md:gap-10 md:overflow-visible md:px-12 md:py-14 md:text-left">
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_45%)]" />
          <Reveal from="left" className="relative md:-my-28">
            <img
              src="/images/reviews-phone.webp"
              alt={`Customer reviews of ${site.name} shown on a phone.`}
              width={663}
              height={1013}
              loading="lazy"
              decoding="async"
              className="mx-auto block h-auto w-56 cursor-pointer drop-shadow-2xl transition duration-500 ease-out hover:-translate-y-4 hover:-rotate-2 hover:scale-105 hover:drop-shadow-[0_35px_45px_rgba(0,0,0,0.45)] sm:w-64 md:w-full md:max-w-[360px]"
            />
          </Reveal>
          <Reveal delay={200} className="relative">
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">Our Reputation Speaks for Itself</h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/85 md:mx-0">
              Drivers choose {site.name} for honest answers, fair prices and licensed agents who actually pick up the phone.
            </p>
            {site.reviewSources.length > 0 && (
              <ul className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-6 md:justify-start">
                {site.reviewSources.map((r) => {
                  const badge = (
                    <>
                      <span className="flex items-center gap-3">
                        <span className="grid h-14 min-w-14 place-items-center rounded-lg bg-white px-2 text-3xl font-semibold text-sky">{r.score}</span>
                        <span className="text-lg font-bold">{r.source}</span>
                      </span>
                      <span className="mt-2 block text-sm text-white/80">{r.count}</span>
                    </>
                  );
                  return (
                    <li key={r.source}>
                      {r.href ? (
                        <a href={r.href} target="_blank" rel="noreferrer" className="block hover:opacity-90">{badge}</a>
                      ) : (
                        badge
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <a href="/quote/auto" className="btn-primary mt-8 inline-flex bg-line uppercase tracking-wide text-asphalt hover:bg-[#E3B21F]">
              Get a free quote
            </a>
          </Reveal>
        </div>
      </section>

      <section id="why-choose" className="scroll-mt-6 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">Why Choose {site.name}</h2>
            <p className="mt-5 text-lg leading-relaxed text-road">
              {fillCompany(content.whyIntro)}
            </p>
          </Reveal>
          <WhyChooseCarousel reasons={reasons} />
        </div>
      </section>

      <CustomerReviews />

      <section id="faq" className="scroll-mt-6 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-4 md:grid-cols-[1fr_1.4fr] md:pb-20 md:pt-6">
          <div>
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">Frequently Asked Questions</h2>
            <p className="mt-3 max-w-sm leading-relaxed text-road">
              Still unsure? Call <a href={biz.phoneHref} className="font-semibold text-sky underline-offset-2 hover:underline">{biz.phone}</a> and a licensed agent will help.
            </p>
            <a href="/quote/auto" className="btn-primary mt-6 inline-flex bg-line uppercase tracking-wide text-asphalt hover:bg-[#E3B21F]">
              Get a free quote
            </a>
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
          <div className="divide-y divide-rail border-y border-rail">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                  {f.q}
                  <span aria-hidden className="text-xl text-road transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-prose leading-relaxed text-road">
                  {f.a}
                  {f.call && (
                    <>
                      {" "}
                      Call <a href={biz.phoneHref} className="font-semibold text-sky underline-offset-2 hover:underline">{biz.phone}</a> for more details.
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-4">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#0B2F5B_0%,#1F5FAD_55%,#3D8FDB_100%)] px-6 pb-14 pt-10 text-white sm:px-12 md:pb-16 md:pt-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.18),transparent_45%)]" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-line">Free · No obligation</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">See what you could pay for car insurance today.</h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-white/85">
                Compare prices from several insurance companies with one quick form, or call a licensed agent for help.
              </p>
            </div>
            <div>
              <ZipStart dark />
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-white/90">
                {["Takes about 5 minutes", "Free to compare", "Licensed in all 50 states"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-line">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div aria-hidden className="lane absolute inset-x-0 bottom-0 h-2" />
        </Reveal>
      </section>
    </>
  );
}
