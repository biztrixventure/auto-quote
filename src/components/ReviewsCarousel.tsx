"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

// Slides review cards sideways in an endless loop: always "next", never rewinding. 1 card on
// phones, 2 on tablets, 3 on desktop. Moves every `interval` seconds, pauses while hovered or
// focused, swipes on touch, and stays still for visitors who prefer reduced motion.
// How the loop works: copies of the first cards sit after the last one; when the track reaches
// them it jumps back to the real first card with the animation off, which looks identical.
export function ReviewsCarousel({ children, interval = 4, label = "Customer reviews" }: { children: ReactNode; interval?: number; label?: string }) {
  const slides = Children.toArray(children);
  const n = slides.length;
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPerView(lg.matches ? 3 : sm.matches ? 2 : 1);
      setReduced(rm.matches);
      setAnimate(false);
      setIndex(0);
    };
    update();
    for (const m of [sm, lg, rm]) m.addEventListener("change", update);
    return () => {
      for (const m of [sm, lg, rm]) m.removeEventListener("change", update);
    };
  }, []);

  const loop = n > perView;
  const track = loop ? [...slides, ...slides.slice(0, perView)] : slides;

  // After a silent jump, turn the animation back on for the next move.
  useEffect(() => {
    if (animate) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [animate]);

  const next = () => {
    setAnimate(true);
    setIndex((i) => Math.min(i + 1, n)); // n = first copy; never run past it
  };
  const prev = () => {
    if (index > 0) {
      setAnimate(true);
      setIndex(index - 1);
      return;
    }
    // At the first card: jump to its copy at the end, then slide back one.
    setAnimate(false);
    setIndex(n);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimate(true);
        setIndex(n - 1);
      }),
    );
  };
  const goTo = (i: number) => {
    setAnimate(true);
    setIndex(i);
  };

  useEffect(() => {
    if (!loop || paused || reduced || interval <= 0) return;
    const t = window.setInterval(next, interval * 1000);
    return () => window.clearInterval(t);
  }, [loop, paused, reduced, interval]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reached the copies: silently swap to the matching real card.
  const settle = () => {
    if (index >= n) {
      setAnimate(false);
      setIndex(index - n);
    }
  };
  // Browsers skip transitions in background tabs, so settle there too.
  useEffect(() => {
    if (index >= n && (reduced || document.hidden)) settle();
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const active = loop ? index % n : 0;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null || !loop) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
      }}
    >
      <div className="-mx-2.5 overflow-hidden py-2">
        <ul
          className={`flex ${loop ? "" : "justify-center"} ${animate && !reduced ? "transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)]" : ""}`}
          style={{ transform: `translateX(-${(index * 100) / perView}%)` }}
          onTransitionEnd={(e) => e.target === e.currentTarget && settle()}
        >
          {track.map((slide, i) => {
            const copy = i >= n;
            const hidden = i < index || i >= index + perView;
            return (
              <li
                key={copy ? `copy-${i}` : i}
                className="flex w-full shrink-0 px-2.5 sm:w-1/2 lg:w-1/3"
                aria-roledescription={copy ? undefined : "slide"}
                aria-label={copy ? undefined : `${i + 1} of ${n}`}
                aria-hidden={copy || hidden}
              >
                {copy && isValidElement(slide) ? cloneElement(slide) : slide}
              </li>
            );
          })}
        </ul>
      </div>

      {loop && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button type="button" onClick={prev} aria-label="Previous review" className="grid h-10 w-10 place-items-center rounded-full border border-rail bg-white text-asphalt transition hover:border-asphalt">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="flex gap-2">
            {Array.from({ length: n }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to review ${i + 1}`}
                aria-current={i === active}
                className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-asphalt" : "w-2 bg-rail hover:bg-road/40"}`}
              />
            ))}
          </div>
          <button type="button" onClick={next} aria-label="Next review" className="grid h-10 w-10 place-items-center rounded-full border border-rail bg-white text-asphalt transition hover:border-asphalt">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
