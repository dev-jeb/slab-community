"use client";

import { sheenClass, SheenContent } from "@/components/ui/sheen";
import type { CollectionBrowseMode } from "@/lib/collection-filters";

/**
 * How the collection is presented — a flat list of cards, or rolled up by set, team, or duplicate.
 *
 * This is a tab strip and not a chip row on purpose. "Sets" and "Teams" used to sit among Autos
 * and Rookies as if picking one meant the same kind of thing, but choosing "Teams" doesn't narrow
 * your collection, it reorganises it. Tabs are the control people already read as "change the
 * view", and putting them above the filters says the filters apply *inside* whichever tab is open.
 */
const MODES: { id: CollectionBrowseMode; label: string; hint: string }[] = [
  { id: "cards", label: "Cards", hint: "Every card, one tile each" },
  { id: "sets", label: "Sets", hint: "Grouped by the product they came from" },
  { id: "teams", label: "Teams", hint: "Grouped by the team on the card" },
  { id: "duplicates", label: "Duplicates", hint: "Cards you own more than one of" },
];

interface CollectionBrowseTabsProps {
  value: CollectionBrowseMode;
  onChange: (mode: CollectionBrowseMode) => void;
  /** Group counts per mode; undefined renders as loading. `cards` uses the collection total. */
  counts: Partial<Record<CollectionBrowseMode, number | undefined>>;
  disabled?: boolean;
}

export function CollectionBrowseTabs({
  value,
  onChange,
  counts,
  disabled = false,
}: CollectionBrowseTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Browse mode"
      className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/40 p-1"
    >
      {MODES.map((mode) => {
        const active = value === mode.id;
        const count = counts[mode.id];
        const loading = count === undefined;

        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-busy={loading}
            title={mode.hint}
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-60 ${sheenClass(
              loading,
            )} ${
              active
                ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/40"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <SheenContent block={false}>{mode.label}</SheenContent>
            <SheenContent
              block={false}
              className={`text-xs tabular-nums ${
                active ? "text-sky-200/80" : "text-slate-500"
              }`}
            >
              {loading ? (
                <>
                  <span className="sr-only">Counting {mode.label.toLowerCase()}</span>
                  {/* Reserves the number's width so the tab doesn't resize when it lands. */}
                  <span aria-hidden="true">&nbsp;&nbsp;</span>
                </>
              ) : (
                count
              )}
            </SheenContent>
          </button>
        );
      })}
    </div>
  );
}
