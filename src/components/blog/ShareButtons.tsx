"use client";

import { useState } from "react";

const ICONS: Record<string, string> = {
  x: "M4 4l16 16M20 4 4 20",
  facebook: "M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z",
  linkedin: "M4 9h4v11H4zM6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h4v1.5c.6-1 1.9-1.8 3.5-1.8 3 0 3.5 2 3.5 4.6V20h-4v-5.8c0-1.4 0-3-1.9-3s-2.1 1.4-2.1 2.9V20h-4z",
  email: "M3 5h18v14H3zM3 6l9 7 9-7",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
};

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    ["x", "Share on X", `https://x.com/intent/post?url=${u}&text=${t}`],
    ["facebook", "Share on Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ["linkedin", "Share on LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["email", "Share by email", `mailto:?subject=${t}&body=${u}`],
  ] as const;
  const cls = "grid h-10 w-10 place-items-center rounded-full border border-rail text-asphalt transition hover:border-asphalt hover:bg-asphalt hover:text-white";
  const icon = (k: string) => (
    <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[k]} /></svg>
  );

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-road">Share</span>
      {links.map(([k, label, href]) => (
        <a key={k} href={href} target={k === "email" ? undefined : "_blank"} rel="noopener noreferrer" aria-label={label} title={label} className={cls}>
          {icon(k)}
        </a>
      ))}
      <button
        type="button"
        aria-label="Copy link"
        title={copied ? "Copied" : "Copy link"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {}
        }}
        className={cls}
      >
        {copied ? <span className="text-xs font-bold">✓</span> : icon("link")}
      </button>
    </div>
  );
}
