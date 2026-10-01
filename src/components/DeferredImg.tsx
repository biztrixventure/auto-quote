"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";

/**
 * An <img> that exists from the first render (so CSS animations stay in sync) but only
 * starts downloading after the page has finished loading and the browser is idle.
 * Use it for pictures that aren't visible straight away, like later hero slides.
 */
export function DeferredImg({ src, srcSet, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const go = () => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(() => setReady(true), { timeout: 3000 });
      else setTimeout(() => setReady(true), 1500);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);

  return <img {...rest} alt={alt} src={ready ? src : undefined} srcSet={ready ? srcSet : undefined} />;
}
