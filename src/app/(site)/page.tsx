import { CustomerReviews } from "@/components/CustomerReviews";
import { HeroSlides } from "@/components/HeroSlides";
import { Reveal } from "@/components/Reveal";
import { FaqSection, QuoteBanner, RepairCostsSection, WhyChooseSection } from "@/components/sections";
import { ZipStart } from "@/components/ZipStart";
import { PRODUCTS, VSC_DISCLOSURE } from "@/lib/products";
import { fillCompany, getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";

export default async function Home() {
  const [{ content }, biz] = await Promise.all([getSettings(), getSite()]);
  // Editable in /admin/content. "{company}" becomes the business name.
  const faqs = content.faqs.map((f, i) => ({ q: fillCompany(f.q), a: fillCompany(f.a), call: i === 0 }));
  const reasons = content.reasons.map((r) => ({ title: fillCompany(r.title), body: fillCompany(r.body) }));

  return (
    <>
      <section className="relative isolate min-h-[590px] overflow-hidden bg-asphalt text-white sm:min-h-[620px]">
        <HeroSlides />
        <div aria-hidden className="absolute inset-0 -z-10 bg-asphalt/65" />
        <div className="mx-auto flex min-h-[590px] max-w-6xl items-center px-5 py-16 sm:min-h-[620px] md:py-20">
          <div className="max-w-2xl">
            <p className="hero-rise mb-5 text-sm font-bold uppercase tracking-[0.14em] text-line">{fillCompany(content.hero.eyebrow)}</p>
            <h1 style={{ animationDelay: "80ms" }} className="hero-rise max-w-xl text-4xl font-bold leading-[1.08] sm:text-5xl md:text-[3.75rem]">
              {fillCompany(content.hero.title)}
            </h1>
            <p className="hero-rise mt-5 max-w-lg text-lg leading-relaxed text-white/85" style={{ animationDelay: "160ms" }}>
              {fillCompany(content.hero.subtitle)}
            </p>
            {/* ZIP start first: the quickest way into the quote. */}
            <div className="hero-rise mt-8 max-w-md" style={{ animationDelay: "240ms" }}>
              <ZipStart dark />
              <p className="mt-3 text-sm text-white/75">Free quote. No obligation. 30-day money-back guarantee.</p>
            </div>
            <div className="hero-rise mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/90" style={{ animationDelay: "320ms" }}>
              <span>Free quotes, no obligation</span>
              <span>Secure, private quote requests</span>
            </div>
          </div>
        </div>
        <div aria-hidden className="lane lane-move h-2.5 w-full" />
      </section>

      <RepairCostsSection costs={content.repairCosts} />

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 text-center md:grid-cols-[1fr_1.15fr] md:gap-12 md:py-16 md:text-left">
          <Reveal className="md:order-1">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">{PRODUCTS.vsc.label}</p>
            <h2 className="mx-auto mt-2 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl md:mx-0">
              Could You Afford A $3,000 Auto Repair Bill Today?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-road md:mx-0">
              A vehicle service contract through {site.name} can help protect your budget from expensive car repair surprises. Our team shows you plan options and prices for your car, backed by a 30-day money-back guarantee.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-road/80 md:mx-0">*A deductible may apply. {VSC_DISCLOSURE}</p>
            <a href={PRODUCTS.vsc.quoteHref} className="btn-primary mt-7 inline-flex bg-line uppercase tracking-wide text-asphalt hover:bg-[#E3B21F]">
              See plan prices for my car
            </a>
            <a href="/extended-car-warranty" className="mt-4 block text-sm font-semibold text-sky hover:underline md:inline-block md:ml-5 md:mt-0">
              How our plans work →
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
              Drivers choose {site.name} for honest answers, fair prices and people who actually pick up the phone.
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
            <a href={PRODUCTS.vsc.quoteHref} className="btn-primary mt-8 inline-flex bg-line uppercase tracking-wide text-asphalt hover:bg-[#E3B21F]">
              Get a free quote
            </a>
          </Reveal>
        </div>
      </section>

      <WhyChooseSection intro={content.whyIntro} reasons={reasons} />

      <CustomerReviews />

      <FaqSection faqs={faqs} phone={biz.phone} phoneHref={biz.phoneHref} />

      <QuoteBanner />
    </>
  );
}
