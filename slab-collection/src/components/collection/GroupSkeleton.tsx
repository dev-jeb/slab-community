"use client";

import { Sheen, SheenBar } from "@/components/ui/sheen";

/**
 * Placeholder rows for a grouped view that hasn't arrived.
 *
 * Grouped views are fetched on demand, so switching to Sets or Teams always means a round trip.
 * Without this the page rendered the *empty state* during that trip — "No team cards found in your
 * collection", on a collection with 37 teams — and the whole layout collapsed to a single short
 * box before springing back. An empty state is a claim that there's nothing there; it can't be the
 * thing shown while we're still asking.
 *
 * The rows are banner-shaped and roughly banner-height so the switch doesn't reflow twice: once
 * into the skeleton, once into the content.
 */
export function GroupSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Sheen loading label="Loading groups" className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <SheenBar className="h-4 w-48" />
            <SheenBar className="h-3 w-28" />
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <SheenBar className="h-5 w-10" />
            <SheenBar className="h-5 w-16" />
          </div>
        </div>
      ))}
    </Sheen>
  );
}
