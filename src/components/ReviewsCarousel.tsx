"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

// Slides review cards sideways: 1 card on phones, 2 on tablets, 3 on desktop. Moves every
// `interval` seconds, pauses while hovered or focused, swipes on touch, and stays still for
// visitors who prefer reduced motion.
export function ReviewsCarousel({ children, interval = 4, label = "Customer reviews" }: { children: ReactNode; interval?: number; label?: string }) {
  const slides = Children.toArray(children);
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
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
    };
    update();
    for (const m of [sm, lg, rm]) m.addEventListener("change", update);
    return () => {
      for (const m of [sm, lg, rm]) m.removeEventListener("change", update);
    };
  }, []);

  const last = Math.max(0, slides.length - perView);
  const current = Math.min(index, last);
  const go = (i: number) => setIndex(i < 0 ? last : i > last ? 0 : i);

  useEffect(() => {
    if (paused || reduced || last === 0 || interval <= 0) return;
    const t = window.setInterval(() => setIndex((i) => (i >= last ? 0 : i + 1)), interval * 1000);
    return () => window.clearInterval(t);
  }, [paused, reduced, last, interval]);

  const few = slides.length <= perView;

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
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="-mx-2.5 overflow-hidden py-2">
        <ul
          className={`flex ${few ? "justify-center" : ""} transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none`}
          style={{ transform: `translateX(-${(current * 100) / perView}%)` }}
        >
          {slides.map((slide, i) => (
            <li
              key={i}
              className="flex w-full shrink-0 px-2.5 sm:w-1/2 lg:w-1/3"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              aria-hidden={i < current || i >= current + perView}
            >
              {slide}
            </li>
          ))}
        </ul>
      </div>

      {last > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button type="button" onClick={() => go(current - 1)} aria-label="Previous reviews" className="grid h-10 w-10 place-items-center rounded-full border border-rail bg-white text-asphalt transition hover:border-asphalt">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="flex gap-2">
            {Array.from({ length: last + 1 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to review ${i + 1}`}
                aria-current={i === current}
                className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-asphalt" : "w-2 bg-rail hover:bg-road/40"}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(current + 1)} aria-label="Next reviews" className="grid h-10 w-10 place-items-center rounded-full border border-rail bg-white text-asphalt transition hover:border-asphalt">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
