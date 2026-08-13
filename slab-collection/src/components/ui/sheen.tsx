"use client";

import type { ReactNode } from "react";

/**
 * The loading sheen — a soft highlight sweeping left to right across something whose contents
 * haven't arrived yet.
 *
 * Use it anywhere a value is in flight: stat chips, cards, table rows, a dashboard tile. It says
 * "this is still settling" without the urgency of a spinner, and it animates a transform rather
 * than layout, so a page full of them stays cheap.
 *
 * The animation itself lives in `globals.css` as `.sheen` (the clipping frame) and `.sheen::after`
 * (the moving highlight), including the `prefers-reduced-motion` opt-out. It's plain CSS with no
 * dependencies, so porting it to another app is that one block plus this file.
 *
 * Two rules the CSS can't enforce, which is why these helpers exist:
 *
 * 1. **The element needs its own stacking context**, or the highlight paints over the content
 *    instead of under it. `Sheen` handles that; `sheenClass` callers must put their content in a
 *    `relative` child (see `SheenContent`).
 * 2. **A placeholder must reserve the real content's size.** If the skeleton is a different height
 *    or width than what replaces it, the layout jumps on arrival — which is more distracting than
 *    no loading state at all.
 */

/**
 * Class helper for elements you can't wrap — a `<button>`, a table row, anything that already has
 * its own styling. Pair it with `SheenContent` around the children.
 *
 * ```tsx
 * <button className={`rounded-full border ${sheenClass(loading)}`} aria-busy={loading}>
 *   <SheenContent>{label}</SheenContent>
 * </button>
 * ```
 */
export function sheenClass(loading: boolean): string {
  return loading ? "sheen" : "";
}

/**
 * Lifts content above the sweeping highlight. Only needed with `sheenClass`; `Sheen` does it for
 * you. Renders a span by default so it's valid inside a button or a paragraph.
 */
export function SheenContent({
  children,
  className = "",
  block = true,
}: {
  children: ReactNode;
  className?: string;
  /** false for inline content, e.g. a badge inside a row of text. */
  block?: boolean;
}) {
  return (
    <span className={`relative ${block ? "block" : ""} ${className}`}>
      {children}
    </span>
  );
}

/**
 * A box that sheens while `loading`. The common case — wrap a card, a tile, a panel.
 *
 * `label` is what a screen reader hears while waiting; the sweep itself is decorative and silent,
 * so without it a loading region announces nothing at all.
 */
export function Sheen({
  loading,
  label = "Loading",
  className = "",
  children,
}: {
  loading: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${sheenClass(loading)} ${className}`} aria-busy={loading}>
      {loading ? <span className="sr-only">{label}</span> : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * A placeholder block standing in for text that hasn't loaded.
 *
 * Size it to match what replaces it — that's the whole job. `h-5 w-14` for a number, `h-4 w-40`
 * for a line of prose. It carries no animation of its own; the sweep comes from the `Sheen`
 * ancestor, so a card full of bars reads as one loading surface rather than several.
 */
export function SheenBar({ className = "h-4 w-24" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded bg-slate-800/80 ${className}`}
    />
  );
}
