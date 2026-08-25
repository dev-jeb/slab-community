"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { formatCurrency } from "@/lib/slab/format";
import type { PrintingSummary } from "@/lib/card-detail";

/**
 * The whole rainbow on one rail you PAGE through, with the printing you're on highlighted in place.
 *
 * A rainbow can run 16 printings deep, so the rail has to stay calm at that size: one row of
 * identical cells rather than three wrapped rows of ragged chips. The row is deliberately NOT a
 * scroller — a bare overflow strip on a desktop trackpad is invisible (no scrollbar, no hint that
 * anything is off to the right), so the track is `overflow-hidden` and the ways through it are the
 * two chevrons flanking it and picking a cell. The chevrons sit outside the track rather than
 * floating over it, so they never cover a printing, and they disappear when the rainbow already
 * fits.
 *
 * **The order never changes.** Every printing sits at a fixed spot (base first, then by value) and
 * picking one moves the highlight, not the cells. Hoisting the active printing to the front is what
 * made a pick read as a page change: the rail you'd just been reading reshuffled under the click.
 * Now the rail slides the picked cell to the middle — a carousel step — and the page swaps its
 * numbers underneath, so you keep your place in the rainbow.
 *
 * Each cell is one printing read top-down: name, then its price as the number that matters with
 * the print run as a small chip beside it. The active printing is the only foil-edged cell on the
 * rail, and ownership is a small emerald dot instead of a badge — so sixteen variants read as one
 * row of options, not sixteen competing labels.
 */

/** Cell width and the gap between cells, in px — the track pages by whole cells, so the arrow
 *  step is computed from these rather than guessed from the viewport. */
const CELL_PX = 168;
const GAP_PX = 8; // gap-2

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

function PageArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous printings" : "Next printings"}
      className={`flex h-[3.75rem] w-8 shrink-0 items-center justify-center rounded-lg border transition ${
        disabled
          ? "cursor-default border-[var(--border)]/40 text-[var(--text-dim)]/30"
          : "border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--foil-dim)] hover:bg-[#1a2744] hover:text-[var(--foil)]"
      }`}
    >
      <Chevron direction={direction} />
    </button>
  );
}

function PrintingCell({
  name,
  printRun,
  fmv,
  owned,
  active,
}: {
  name: string;
  printRun?: number | null;
  fmv: string | null;
  owned: number;
  active: boolean;
}) {
  return (
    <span
      className={`relative flex h-[3.75rem] flex-col justify-between rounded-lg border px-3 py-2 transition duration-200 ${
        active
          ? "border-[var(--foil-dim)] bg-[#1a2744]"
          : "border-[var(--border)] bg-[var(--surface-raised)] group-hover:border-[var(--border-bright)] group-hover:bg-[#1a2744]"
      }`}
      style={{ width: CELL_PX }}
    >
      {/* The portal's foil corner tick, borrowed from .stat-tile: it marks the active cell
          without spending a second color on the border. */}
      <span
        aria-hidden="true"
        className={`absolute -left-px -top-px h-0.5 bg-[var(--foil)] transition-all duration-200 ${
          active ? "w-3" : "w-0"
        }`}
      />

      <span className="flex items-center gap-1.5">
        <span
          className={`truncate text-[13px] font-medium transition-colors duration-200 ${
            active ? "text-[var(--foil)]" : "text-slate-200"
          }`}
        >
          {name}
        </span>
        {owned > 0 ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
            title={`You own ${owned}`}
          />
        ) : null}
      </span>

      <span className="flex items-baseline justify-between gap-2">
        <span
          className={`font-mono text-sm tabular-nums ${
            fmv ? "text-slate-100" : "text-[var(--text-dim)]"
          }`}
        >
          {fmv ? formatCurrency(fmv) : "—"}
        </span>
        {printRun ? (
          <span className="shrink-0 rounded border border-[var(--border)] px-1 font-mono text-[10px] leading-4 text-[var(--text-dim)]">
            /{printRun}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function PrintingStrip({
  printings,
  activeUuid,
  onPick,
}: {
  printings: PrintingSummary[];
  activeUuid: string;
  /** Swap the page to this printing in place. Undefined falls back to plain link navigation. */
  onPick?: (uuid: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [overflowing, setOverflowing] = useState(false);

  // One reader for all three flags, run on scroll AND on resize: a rail that fits at 1440px
  // overflows at 1100px, and arrows that don't notice are either dead or missing.
  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setOverflowing(max > 1);
    setAtStart(track.scrollLeft <= 1);
    setAtEnd(track.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(track);
    return () => observer.disconnect();
  }, [sync, printings.length]);

  // The carousel step: slide the active printing to the middle of the rail whenever it changes.
  // Landing on the page is not a step, so the first pass jumps rather than animating — otherwise
  // arriving at a parallel deep in a 16-cell rainbow starts with a scroll you didn't ask for.
  const stepped = useRef(false);
  useLayoutEffect(() => {
    const track = trackRef.current;
    const cell = track?.querySelector<HTMLElement>('[data-active="true"]');
    if (!track || !cell) return;

    const centered = cell.offsetLeft - (track.clientWidth - cell.offsetWidth) / 2;
    track.scrollTo({
      left: Math.max(0, centered),
      behavior: stepped.current && !prefersReducedMotion() ? "smooth" : "instant",
    });
    stepped.current = true;
  }, [activeUuid]);

  // Page by whole cells, one short of a full viewport, so the printing you were reading at the
  // edge stays on screen as the anchor for where you just came from. Computed from the cell size
  // rather than left to CSS scroll snapping, which would fight the centering step above.
  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const stride = CELL_PX + GAP_PX;
    const inView = Math.max(1, Math.floor((track.clientWidth + GAP_PX) / stride));
    track.scrollBy({
      left: direction * Math.max(1, inView - 1) * stride,
      behavior: prefersReducedMotion() ? "instant" : "smooth",
    });
  };

  /**
   * A plain left click swaps the page in place; every other click keeps the link's own behavior.
   *
   * These stay real `<a href>`s on purpose — middle-click, ⌘-click and "copy link address" are how
   * people compare two parallels side by side, and a `<button>` rail throws all three away.
   */
  const pick = (event: MouseEvent<HTMLAnchorElement>, uuid: string) => {
    if (!onPick) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onPick(uuid);
  };

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h3 className="heading-section">Printings</h3>
        <span className="text-xs text-[var(--text-dim)]">
          {printings.length} total
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {overflowing ? (
          <PageArrow direction="left" disabled={atStart} onClick={() => page(-1)} />
        ) : null}

        <div
          ref={trackRef}
          onScroll={sync}
          // `relative` so a cell's offsetLeft is measured against the track — that's what the
          // carousel step centers on.
          className="relative flex min-w-0 flex-1 gap-2 overflow-hidden"
        >
          {printings.map(({ card, headlineFmv, ownedCount }) => {
            const active = card.uuid === activeUuid;
            return (
              <Link
                key={card.uuid}
                href={`/cards/${card.uuid}`}
                // Nothing to prefetch: a plain click never navigates, and a 16-deep rainbow would
                // otherwise pull sixteen route payloads for pages no one is going to.
                prefetch={false}
                onClick={(event) => pick(event, card.uuid)}
                data-active={active}
                aria-current={active ? "true" : undefined}
                className="pressable group shrink-0"
                title={card.finish ?? "Base"}
              >
                <PrintingCell
                  name={card.finish ?? "Base"}
                  printRun={card.print_run}
                  fmv={headlineFmv}
                  owned={ownedCount}
                  active={active}
                />
              </Link>
            );
          })}
        </div>

        {overflowing ? (
          <PageArrow direction="right" disabled={atEnd} onClick={() => page(1)} />
        ) : null}
      </div>
    </section>
  );
}
