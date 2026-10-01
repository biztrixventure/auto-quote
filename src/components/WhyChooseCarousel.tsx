"use client";

import { useCallback, useEffect, useRef, useState } from "react";


function Chevrons({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="m12 5-7 7 7 7M19 5l-7 7 7 7" /> : <path d="m12 5 7 7-7 7M5 5l7 7-7 7" />}
    </svg>
  );
}

const AUTOPLAY_MS = 3000;

// Animations are switched off for reduced motion (globals.css), so slides just swap.
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function WhyChooseCarousel({ reasons }: { reasons: { title: string; body: string }[] }) {
  // Slides are followed by a copy of the first one, so moving from the last slide
  // to the first still slides forward; we then jump back to index 0 without animating.
  const slides = [...reasons, reasons[0]];
  const last = reasons.length;
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const next = useCallback(() => {
    if (reducedMotion()) return setIndex((i) => (i + 1) % last);
    setAnimate(true);
    setIndex((i) => Math.min(i + 1, last));
  }, [last]);

  const prev = () => {
    if (reducedMotion()) {
      setIndex((index - 1 + last) % last);
    } else if (index === 0) {
      // Jump to the copy at the end, then slide back one so it still moves right-to-left.
      setAnimate(false);
      setIndex(last);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setAnimate(true);
          setIndex(last - 1);
        }),
      );
    } else {
      setAnimate(true);
      setIndex(index - 1);
    }
  };

  useEffect(() => {
    if (paused || reducedMotion()) return;
    const id = window.setInterval(next, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, next]);

  const current = index % last;
  const arrow = "grid h-12 w-12 shrink-0 place-items-center rounded-full text-sky transition hover:bg-sky/10 hover:text-[#174C8C] sm:h-14 sm:w-14";

  return (
    <div
      className="mt-8 flex items-center gap-2 py-6 sm:gap-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        if (touchX.current !== null) {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        }
        touchX.current = null;
        setPaused(false);
      }}
    >
      <button type="button" aria-label="Previous reason" onClick={prev} className={arrow}>
        <Chevrons dir="left" />
      </button>

      <div aria-live={paused ? "polite" : "off"} className="flex-1 overflow-hidden">
        <div
          className={`flex ${animate ? "transition-transform duration-700 ease-in-out" : ""}`}
          style={{ transform: `translateX(-${index * 100}%)` }}
          onTransitionEnd={() => {
            if (index === last) {
              setAnimate(false);
              setIndex(0);
            }
          }}
        >
          {slides.map((r, i) => (
            <div key={i} aria-hidden={i !== index} className="w-full shrink-0 px-1 text-center">
              <h3 className="text-2xl font-semibold text-asphalt sm:text-[1.7rem]">{r.title}</h3>
              <p className="mx-auto mt-3 max-w-3xl text-lg leading-relaxed text-road">{r.body}</p>
            </div>
          ))}
        </div>
      </div>

      <button type="button" aria-label="Next reason" onClick={next} className={arrow}>
        <Chevrons dir="right" />
      </button>
      <span className="sr-only">
        Showing {current + 1} of {last}
      </span>
    </div>
  );
}
