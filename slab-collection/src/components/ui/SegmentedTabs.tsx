"use client";

import { sheenClass, SheenContent } from "@/components/ui/sheen";

/**
 * A compact segmented control for "which view am I looking at" — the collection's
 * Cards/Sets/Teams/Duplicates, the portfolio's Portfolio/Sales.
 *
 * Shared because they're the same question asked twice, and they had answered it differently: one
 * was a full-width bar holding two small buttons, so most of it was empty rail. This sizes to its
 * content (`w-fit`), which is what makes a switcher read as a control rather than a header.
 *
 * A tab may carry a count. Counts are optional per tab because not every view has one to show —
 * and a tab that declares a count but hasn't received it yet sheens rather than rendering 0,
 * because a confident wrong number is worse than an obvious wait.
 */
export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  /** Tooltip — say what the view does, not what the label already says. */
  hint?: string;
  /** True if this tab shows a count. With `count` undefined, the tab sheens. */
  showCount?: boolean;
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Names the group for screen readers, e.g. "Browse mode". */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/40 p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        const loading = tab.showCount === true && tab.count === undefined;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-busy={loading}
            title={tab.hint}
            disabled={disabled}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${sheenClass(
              loading,
            )} ${
              active
                ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/40"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <SheenContent block={false}>{tab.label}</SheenContent>
            {tab.showCount ? (
              <SheenContent
                block={false}
                className={`text-xs tabular-nums ${
                  active ? "text-sky-200/80" : "text-slate-500"
                }`}
              >
                {loading ? (
                  <>
                    <span className="sr-only">Counting {tab.label.toLowerCase()}</span>
                    {/* Reserves the number's width so the tab doesn't resize when it lands. */}
                    <span aria-hidden="true">&nbsp;&nbsp;</span>
                  </>
                ) : (
                  tab.count
                )}
              </SheenContent>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
