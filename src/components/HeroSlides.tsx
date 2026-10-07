"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

// Home hero photos: a slow zoom and drift (to the right, away from the headline) on the photo that's showing, then a crossfade to the
// next one. The first photo loads right away (it's the largest thing on the page); the others
// only start downloading after the page has loaded, and a slide only changes once the next
// photo is ready. People who ask their device for less motion get still photos.

const SLIDES = [
  { name: "Ram 1500", file: "hero-ram", drift: "2%" },
  { name: "Ford F-150", file: "hero-f150", drift: "1.5%" },
  { name: "Toyota RAV4", file: "hero-rav4", drift: "1.5%" },
];
const SHOW_MS = 7000; // how long each photo stays
const FADE_MS = 1200; // crossfade length; matches .hero-slide in globals.css

const srcSet = (file: string) => [640, 1024, 1600, 2048].map((w) => `/images/hero/${file}-${w}.webp ${w}w`).join(", ");

export function HeroSlides() {
  const [active, setActive] = useState(0);
  const [intro, setIntro] = useState(true); // the first photo zooms with a CSS animation until the first change
  const [loadRest, setLoadRest] = useState(false);
  const [loaded, setLoaded] = useState<boolean[]>(() => SLIDES.map((_, i) => i === 0));
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const start = () => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(() => setLoadRest(true), { timeout: 3000 });
      else setTimeout(() => setLoadRest(true), 1500);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  const show = useCallback(
    (i: number) => {
      setActive(i);
      if (intro) setTimeout(() => setIntro(false), FADE_MS + 100);
    },
    [intro],
  );

  // Move on after SHOW_MS, but only to a photo that has finished loading.
  useEffect(() => {
    if (still) return;
    const next = (active + 1) % SLIDES.length;
    if (!loaded[next]) return;
    const t = setTimeout(() => show(next), SHOW_MS);
    return () => clearTimeout(t);
  }, [active, loaded, still, show]);

  return (
    <>
      {SLIDES.map((s, i) => {
        const on = i === 0 || loadRest;
        return (
          <img
            key={s.file}
            src={on ? `/images/hero/${s.file}-1600.webp` : undefined}
            srcSet={on ? srcSet(s.file) : undefined}
            sizes="100vw"
            fetchPriority={i === 0 ? "high" : undefined}
            decoding="async"
            alt=""
            aria-hidden="true"
            onLoad={() => setLoaded((l) => (l[i] ? l : l.map((v, j) => (j === i ? true : v))))}
            style={{ "--kb-x": s.drift } as CSSProperties}
            className={`hero-slide object-[58%_55%] ${i === active ? "is-active" : ""} ${i === 0 && intro ? "is-intro" : ""}`}
          />
        );
      })}

      {/* Which vehicle is showing, with a bar that fills until the next photo. */}
      <div className="absolute inset-x-0 bottom-10 hidden md:block">
        <div className="mx-auto flex max-w-6xl justify-end gap-6 px-5">
          {SLIDES.map((s, i) => (
            <button
              key={s.file}
              type="button"
              onClick={() => show(i)}
              aria-pressed={i === active}
              aria-label={`Show the ${s.name} photo`}
              className={`w-28 text-left text-xs font-semibold uppercase tracking-[0.12em] transition ${i === active ? "text-white" : "text-white/55 hover:text-white/85"}`}
            >
              <span className="block h-[3px] overflow-hidden rounded-full bg-white/25">
                {i === active && (
                  <span className={`block h-full rounded-full bg-line ${still ? "w-full" : "hero-progress"}`} style={{ animationDuration: `${SHOW_MS}ms` }} />
                )}
              </span>
              <span className="mt-2 block">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
