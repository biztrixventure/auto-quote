"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  // Delay in ms, for staggering neighbouring elements.
  delay?: number;
  from?: "up" | "left" | "right" | "pop";
};

const offsets = { up: "translate-y-10", left: "-translate-x-12", right: "translate-x-12", pop: "translate-y-6 scale-90" };

// Fades and slides its children in the first time they scroll into view.
export function Reveal({ children, className = "", delay = 0, from = "up" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ${from === "pop" ? "ease-[cubic-bezier(0.34,1.56,0.64,1)]" : "ease-out"} ${visible ? "translate-x-0 translate-y-0 scale-100 opacity-100" : `opacity-0 ${offsets[from]}`} ${className}`}
    >
      {children}
    </div>
  );
}
