"use client";

import type { ReactNode } from "react";

/**
 * "You have N of M slots" — the headline percentage, the count under it, and a bar beside it.
 *
 * One component because it's one figure asked in two places, and the two copies had already
 * drifted: your own chase set toned the number by how close you were (emerald at 100, sky past
 * half, grey below), while the same set seen on the community page rendered it flat sky. A set at
 * 100% looked finished in one view and unremarkable in the other.
 *
 * The label differs on purpose ("Card slots" on your own set, "Your completion" on someone
 * else's), so it's a prop; the colour rule isn't a matter of context, so it isn't.
 */

/** Emerald when it's done, sky once it's past halfway, grey while it's still early. */
export function completionTone(pct: number): string {
  if (pct >= 100) return "text-emerald-400";
  if (pct >= 50) return "text-sky-300";
  return "text-slate-300";
}

export function CompletionMeter({
  label,
  pct,
  ownedCards,
  totalCards,
  /** Denser surfaces want a smaller headline; the bar and the tone stay the same. */
  size = "lg",
  /** An extra line under the count — the player-level completion, where there is one. */
  children,
}: {
  label: string;
  pct: number;
  ownedCards: number;
  totalCards: number;
  size?: "md" | "lg";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
        <p
          className={`${size === "lg" ? "text-3xl" : "text-2xl"} font-semibold ${completionTone(pct)}`}
        >
          {pct.toFixed(1)}%
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {ownedCards} of {totalCards} slots owned
        </p>
        {children}
      </div>
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800 sm:w-48">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
