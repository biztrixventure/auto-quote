import { CustomerReviews } from "@/components/CustomerReviews";
import { DeferredImg } from "@/components/DeferredImg";
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
            {/* Car insurance ZIP start first: the quickest way in. Service contracts get a quieter link. */}
            <div className="mt-8 max-w-md">
              <ZipStart dark />
              <p className="mt-3 text-sm text-white/75">Free to compare. No obligation to buy.</p>
              <p className="mt-4 text-sm text-white/85">
                Worried about repair bills instead?{" "}
                <a href={PRODUCTS.vsc.quoteHref} className="font-semibold text-line underline-offset-2 hover:underline">Get a vehicle service contract quote →</a>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/90">
              <span>Free quotes, no obligation</span>
              <span>Secure, private quote requests</span>
            </div>
          </div>
        </div>
        <div aria-hidden className="lane h-2.5 w-full" />
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
              A vehicle service contract through {site.name} can help protect your budget from expensive car repair surprises. Our team shows you plan options and prices for your car.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-road/80 md:mx-0">*A deductible may apply. {VSC_DISCLOSURE}</p>
            <a href={PRODUCTS.vsc.quoteHref} className="btn-primary mt-7 inline-flex bg-line uppercase tracking-wide text-asphalt hover:bg-[#E3B21F]">
              Get a service contract quote
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
            <a href="/quote" className="btn-primary mt-8 inline-flex bg-line uppercase tracking-wide text-asphalt hover:bg-[#E3B21F]">
              Get a free quote
            </a>
          </Reveal>
        </div>
      </section>

      <WhyChooseSection intro={content.whyIntro} reasons={reasons} />

      <CustomerReviews />

      <FaqSection faqs={faqs} phone={biz.phone} phoneHref={biz.phoneHref} />

      {/* Car insurance: a separate product with its own section and quote form. */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-6 pt-14 md:pt-20">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-sky">{PRODUCTS.auto.label}</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Compare Car Insurance Quotes</h2>
            <p className="mt-5 text-lg leading-relaxed text-road">
              Car insurance pays for damage and injuries after an accident, and almost every state requires it. Compare prices from several insurance companies
              with one form, and check exactly what your state requires.
            </p>
            <a href="/car-insurance" className="mt-5 inline-block font-semibold text-sky hover:underline">See car insurance requirements by state →</a>
          </Reveal>
        </div>
      </section>

      <QuoteBanner product="auto" />
    </>
  );
}
