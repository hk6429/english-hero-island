"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 900;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function XpCountUp({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(prefersReducedMotion() ? to : from);

  useEffect(() => {
    if (prefersReducedMotion() || to <= from) {
      setValue(to);
      return;
    }

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const progressRatio = Math.min(1, (now - start) / DURATION_MS);
      setValue(Math.round(from + (to - from) * progressRatio));
      if (progressRatio < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return <span aria-hidden="true">{value}</span>;
}
