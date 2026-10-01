"use client";

import { useEffect, useRef, useState } from "react";

type Part = {
  name: string;
  cost: string;
  image: string;
  // Marker centre as a percentage of the car image.
  x: number;
  y: number;
};

const parts: Part[] = [
  { name: "Engine Cylinder Head", cost: "$7,500", image: "/images/parts/cylinder-head.webp", x: 30, y: 44 },
  { name: "Alternator", cost: "$628-$814", image: "/images/parts/alternator.webp", x: 16, y: 55 },
  { name: "Instrument Cluster", cost: "$885-$905", image: "/images/parts/instrument-cluster.webp", x: 54, y: 35 },
  { name: "A/C Compressor", cost: "$550", image: "/images/parts/ac-compressor.webp", x: 26, y: 66 },
  { name: "Backup Camera", cost: "$631-$647", image: "/images/parts/backup-camera.webp", x: 98, y: 32 },
  { name: "Transmission", cost: "$3,000", image: "/images/parts/transmission.webp", x: 67, y: 70 },
  { name: "Power Steering Pump", cost: "$500-$800", image: "/images/parts/power-steering-pump.webp", x: 16, y: 76 },
  { name: "Suspension Struts", cost: "$1,254", image: "/images/parts/suspension-strut.webp", x: 52, y: 52 },
];

export function RepairCostDiagram({ costs = {} }: { costs?: Record<string, string> }) {
  const [selected, setSelected] = useState(4);
  // Prices are editable in /admin/content; the built-in values are the fallback.
  const priceOf = (p: Part) => costs[p.name] || p.cost;
  const part = parts[selected];
  // Part photos are only fetched once the diagram is about to scroll into view.
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-8 grid items-center gap-8 md:grid-cols-[1.4fr_1fr] md:gap-12">
      <div className="relative mx-auto w-full max-w-[640px]">
        <img
          src="/images/car-diagram.webp"
          alt="Car diagram with selectable components and their typical repair costs."
          width={587}
          height={351}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        {parts.map((p, i) => {
          const active = i === selected;
          return (
            <button
              key={p.name}
              type="button"
              aria-label={`${p.name} repair cost`}
              aria-pressed={active}
              onClick={() => setSelected(i)}
              onMouseEnter={() => setSelected(i)}
              onFocus={() => setSelected(i)}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className={`absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 transition duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky sm:h-8 sm:w-8 ${
                active
                  ? "z-10 border-[#F28C28] bg-white text-[#F28C28]"
                  : "border-transparent bg-[#1D4A5C] text-white shadow-[0_0_0_4px_rgba(29,74,92,0.2)]"
              }`}
            >
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" className="max-sm:h-3.5 max-sm:w-3.5">
                <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="mx-auto w-full max-w-sm text-center text-asphalt">
        <h3 className="text-xl font-bold">{part.name}</h3>
        <div className="mx-auto mt-5 grid h-40 place-items-center">
          <img src={part.image} alt={part.name} loading="lazy" decoding="async" className="max-h-40 w-auto max-w-full object-contain" />
        </div>
        <p className="mt-5 text-lg text-road">Average Out of Pocket Cost without Coverage</p>
        <p className="mt-1 text-3xl font-bold sm:text-4xl">{priceOf(part)}</p>
      </div>
      {/* Warm the other part photos once the diagram is near, so switching parts is instant. */}
      {near && (
        <div hidden>
          {parts.map((p) => <img key={p.name} src={p.image} alt="" decoding="async" />)}
        </div>
      )}
    </div>
  );
}
