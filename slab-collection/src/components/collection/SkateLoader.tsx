"use client";

import { useEffect, useState } from "react";

/**
 * A skater gliding in and throwing a hockey stop, for the moment a stat is still loading.
 *
 * It sits where a number will go, so it has to hold that space without moving anything: every
 * frame is padded to the same width and rendered in a tabular monospace line. A ragged-width
 * animation would shove the chip's layout around on every tick.
 */
const FRAME_WIDTH = 10;

// Frames are written short and padded, so the art stays readable in source and can't drift out of
// alignment by a miscounted space.
const FRAMES = [
  "›",
  " ›",
  "  ›",
  "   ›",
  "    ›",
  "     ›",
  "     |·",
  "     |·˙",
  "     |˙·.",
  "     |·.˙·",
  "     | ·.",
  "     |  ·",
].map((frame) => frame.padEnd(FRAME_WIDTH));

/** The stop itself — shown when the viewer asked for reduced motion. */
const STILL = FRAMES[9];

const FRAME_MS = 110;

function usesReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface SkateLoaderProps {
  /** Describes what's loading, for screen readers — the art itself is decorative. */
  label?: string;
  className?: string;
}

export function SkateLoader({ label = "Loading", className = "" }: SkateLoaderProps) {
  const [frame, setFrame] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(
      () => setFrame((current) => (current + 1) % FRAMES.length),
      FRAME_MS,
    );
    return () => clearInterval(timer);
  }, [reducedMotion]);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className="whitespace-pre font-mono text-slate-600 tabular-nums"
      >
        {reducedMotion ? STILL : FRAMES[frame]}
      </span>
    </span>
  );
}

export { usesReducedMotion };
