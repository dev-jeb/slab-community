"use client";

import type { ReactNode } from "react";

import { sheenClass, SheenBar, SheenContent } from "@/components/ui/sheen";

/**
 * A single headline figure — the unit both the collection summary and the portfolio page are built
 * from.
 *
 * It lives here because there were two of these, copied, and they had already drifted: the
 * portfolio's copy had no way to colour a value, so unrealized P&L rendered plain white there and
 * green on the collection page. The same number should not change meaning between two pages.
 *
 * Deliberately compact. These stack six-to-a-screen above the content people actually came for, so
 * every extra row of padding pushes real cards below the fold.
 */

/**
 * Green for a gain, red for a loss, neutral for flat or unknown.
 *
 * `neutral` exists because denser surfaces (card tiles, sales rows) want a dimmer resting colour
 * than a headline stat does. It's a parameter rather than three copies of this function, which is
 * what it was before.
 */
export function gainTone(
  value?: string | null,
  neutral = "text-slate-300",
): string {
  if (!value) return neutral;
  const num = Number(value);
  if (num > 0) return "text-emerald-400";
  if (num < 0) return "text-rose-400";
  return neutral;
}

interface StatCardProps {
  label: string;
  value: string;
  /** Secondary line — a derived figure or a qualifier, never a second headline. */
  hint?: string;
  /** Tailwind text colour for the value; pair with `gainTone` for signed money. */
  tone?: string;
  /** Sheens and shows a placeholder instead of the value. */
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "text-white",
  loading = false,
}: StatCardProps) {
  return (
    <div
      aria-busy={loading}
      className={`rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5 ${sheenClass(
        loading,
      )}`}
    >
      <SheenContent>
        <span className="block text-[11px] uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {loading ? (
          <>
            <span className="sr-only">Loading {label.toLowerCase()}</span>
            {/* Matches the value's line box, so nothing shifts when the number lands. */}
            <span className="my-1 block">
              <SheenBar className="h-6 w-24" />
            </span>
          </>
        ) : (
          <span className={`mt-0.5 block text-xl font-semibold ${tone}`}>
            {value}
          </span>
        )}
        {hint ? (
          <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
        ) : null}
      </SheenContent>
    </div>
  );
}

/**
 * The grid stat cards sit in. One definition so the two pages can't drift apart on column counts
 * and gaps the way their cards did.
 */
export function StatGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${className}`}
    >
      {children}
    </section>
  );
}
