import { Reveal } from "@/components/Reveal";
import { getSettings } from "@/lib/settings";

function Stars({ rating, size = 20 }: { rating: number; size?: number }) {
  const pct = Math.max(0, Math.min(rating, 5)) * 20;
  const row = (className: string) => (
    <span className={`flex ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
  return (
    <span className="relative inline-block" role="img" aria-label={`${rating} out of 5 stars`}>
      {row("text-rail")}
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row("text-line")}
      </span>
    </span>
  );
}

// Shows real reviews from /admin/content; renders nothing until reviews are added.
export async function CustomerReviews() {
  const { content } = await getSettings();
  const { summary, items: reviews, award } = content.reviews;
  if (reviews.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <Reveal className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">What Our Customers Say</h2>
          {summary && (
            <a href={summary.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1 font-semibold text-sky">
              Read more reviews
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:translate-x-0.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
          )}
        </Reveal>

        <Reveal delay={100} className="mt-8 rounded-2xl border border-rail bg-white p-6 shadow-[0_8px_30px_rgba(38,42,48,0.06)] sm:p-10">
          {summary && (
            <div className="mb-8 flex flex-col items-center text-center">
              <p className="text-lg font-bold">{summary.platform}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl font-extrabold">{summary.rating.toFixed(1)}</span>
                <Stars rating={summary.rating} size={26} />
              </div>
              <p className="mt-2 text-sm text-road">
                Overall satisfaction rating based on {summary.count.toLocaleString("en-US")} ratings
              </p>
            </div>
          )}
          <ul className="grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={`${r.name}-${r.date}`} className="flex flex-col rounded-xl border border-rail p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {r.name}
                      {r.location && <span className="font-normal text-road"> of {r.location}</span>}
                    </p>
                    <p className="mt-0.5 text-sm text-road/80">{r.date}</p>
                  </div>
                  <Stars rating={r.rating} size={18} />
                </div>
                <p className="mt-4 leading-relaxed text-road">{r.text}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        {award && (
          <Reveal delay={150} className="mt-12 text-center">
            <p className="text-xl font-bold uppercase tracking-wide sm:text-2xl">{award.text}</p>
            <a href={award.url} target="_blank" rel="noreferrer" className="btn-primary mt-5 inline-flex bg-line text-asphalt hover:bg-[#E3B21F]">
              Read the review
            </a>
          </Reveal>
        )}
      </div>
    </section>
  );
}
