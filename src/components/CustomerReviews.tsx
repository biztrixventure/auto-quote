import { Reveal } from "@/components/Reveal";
import { ReviewsCarousel } from "@/components/ReviewsCarousel";
import { getSettings, type ReviewItem } from "@/lib/settings";

const clamp = (r: number) => Math.max(0, Math.min(r, 5));
const STAR = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z";

// Trustpilot's wording for an average score.
function scoreWord(r: number) {
  if (r >= 4.5) return "Excellent";
  if (r >= 3.8) return "Great";
  if (r >= 2.8) return "Average";
  if (r >= 1.8) return "Poor";
  return "Bad";
}

/** Green square stars, filled part-way for fractional ratings. */
function TrustpilotStars({ rating, size = 22 }: { rating: number; size?: number }) {
  const r = clamp(rating);
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, r - i)) * 100;
        return (
          <span
            key={i}
            className="grid place-items-center"
            style={{ width: size, height: size, background: `linear-gradient(90deg, #00B67A ${fill}%, #DCDCE6 ${fill}%)` }}
          >
            <svg aria-hidden width={size * 0.72} height={size * 0.72} viewBox="0 0 24 24" fill="#fff"><path d={STAR} /></svg>
          </span>
        );
      })}
    </span>
  );
}

function TrustpilotMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold tracking-tight text-[#191919] ${className}`}>
      <svg aria-hidden width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="#00B67A"><path d={STAR} /></svg>
      Trustpilot
    </span>
  );
}

/** Yellow round stars (Google style), filled part-way for fractional ratings. */
function GoogleStars({ rating, size = 18 }: { rating: number; size?: number }) {
  const pct = clamp(rating) * 20;
  const row = (color: string) => (
    <span className="flex" style={{ color }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0"><path d={STAR} /></svg>
      ))}
    </span>
  );
  return (
    <span className="relative inline-block" role="img" aria-label={`${rating} out of 5 stars`}>
      {row("#E0E0E0")}
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>{row("#FBBC04")}</span>
    </span>
  );
}

function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

const AVATAR_COLORS = ["#1A73E8", "#D93025", "#188038", "#E37400", "#9334E6", "#007B83"];
function Avatar({ name }: { name: string }) {
  const color = AVATAR_COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-semibold text-white" style={{ background: color }}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function TrustpilotCard({ r }: { r: ReviewItem }) {
  return (
    <article className="flex w-full flex-col rounded-xl border border-[#E5E5DD] bg-white p-6 shadow-[0_2px_10px_rgba(25,25,25,0.04)]">
      <TrustpilotStars rating={r.rating} size={20} />
      {r.title && <h3 className="mt-4 text-[17px] font-bold leading-snug text-[#191919]">{r.title}</h3>}
      <p className={`${r.title ? "mt-2" : "mt-4"} line-clamp-6 flex-1 leading-relaxed text-[#3a3a3a]`}>{r.text}</p>
      <p className="mt-5 border-t border-[#EFEFEA] pt-4 text-sm">
        <span className="font-semibold text-[#191919]">{r.name}</span>
        {r.location && <span className="text-road">, {r.location}</span>}
        {r.date && <span className="block text-road/80">{r.date}</span>}
      </p>
    </article>
  );
}

function GoogleCard({ r }: { r: ReviewItem }) {
  return (
    <article className="flex w-full flex-col rounded-xl border border-[#E8EAED] bg-white p-6 shadow-[0_1px_3px_rgba(60,64,67,0.12)]">
      <div className="flex items-start gap-3">
        <Avatar name={r.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#202124]">{r.name}</p>
          <p className="truncate text-sm text-[#5F6368]">{[r.location, r.date].filter(Boolean).join(" · ")}</p>
        </div>
        <GoogleG size={20} />
      </div>
      <div className="mt-4"><GoogleStars rating={r.rating} /></div>
      {r.title && <h3 className="mt-3 font-semibold text-[#202124]">{r.title}</h3>}
      <p className={`${r.title ? "mt-1.5" : "mt-3"} line-clamp-6 flex-1 leading-relaxed text-[#3C4043]`}>{r.text}</p>
    </article>
  );
}

// Shows real reviews from /admin/content; renders nothing until reviews are added.
export async function CustomerReviews() {
  const { content } = await getSettings();
  const { summary, items: reviews, award } = content.reviews;
  const theme = content.reviews.theme ?? "trustpilot";
  const interval = content.reviews.autoplaySeconds ?? 4;
  if (reviews.length === 0) return null;
  const isTp = theme === "trustpilot";

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">What Our Customers Say</h2>

          {summary &&
            (isTp ? (
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-2xl font-bold text-[#191919]">{scoreWord(summary.rating)}</p>
                <TrustpilotStars rating={summary.rating} size={34} />
                <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-[15px] text-[#3a3a3a]">
                  Rated <strong>{summary.rating.toFixed(1)}</strong> / 5 based on
                  {summary.url ? (
                    <a href={summary.url} target="_blank" rel="noreferrer" className="font-semibold underline decoration-[#00B67A] decoration-2 underline-offset-4">
                      {summary.count.toLocaleString("en-US")} reviews
                    </a>
                  ) : (
                    <strong>{summary.count.toLocaleString("en-US")} reviews</strong>
                  )}
                  on <TrustpilotMark className="text-[17px]" />
                </p>
              </div>
            ) : (
              <div className="mx-auto mt-6 inline-flex flex-col items-center gap-4 rounded-2xl border border-[#E8EAED] px-8 py-5 shadow-[0_1px_3px_rgba(60,64,67,0.12)] sm:flex-row sm:gap-6">
                <div className="flex items-center gap-3">
                  <GoogleG size={36} />
                  <div className="text-left">
                    <p className="font-semibold text-[#202124]">Google Reviews</p>
                    <p className="flex items-center gap-2">
                      <span className="text-xl font-bold text-[#202124]">{summary.rating.toFixed(1)}</span>
                      <GoogleStars rating={summary.rating} size={20} />
                    </p>
                    <p className="text-sm text-[#5F6368]">Based on {summary.count.toLocaleString("en-US")} reviews</p>
                  </div>
                </div>
                {summary.url && (
                  <a href={summary.url} target="_blank" rel="noreferrer" className="rounded-full bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1765CC]">
                    See all reviews
                  </a>
                )}
              </div>
            ))}
        </Reveal>

        <Reveal delay={100} className="mt-10">
          <ReviewsCarousel interval={interval}>
            {reviews.map((r, i) => (isTp ? <TrustpilotCard key={i} r={r} /> : <GoogleCard key={i} r={r} />))}
          </ReviewsCarousel>
          {isTp && summary && (
            <p className="mt-6 text-center text-sm text-road">
              Showing our latest reviews from <TrustpilotMark />
            </p>
          )}
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
