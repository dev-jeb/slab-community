"use client";

import { useState, useTransition } from "react";

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
 *
 * **A click lands here before its view does.** Several of these switchers change a URL
 * (`/?view=grading`, `/search?scope=catalog`), so `value` doesn't move until the route renders —
 * a few hundred milliseconds where the tab you clicked still looked unselected and the page still
 * showed the old view, which reads as a dropped click. The switch runs inside a transition, so
 * the clicked tab takes the selected style immediately and sheens until the view catches up. For
 * a caller whose `onChange` is plain local state that resolves in the same frame, this costs
 * nothing and shows nothing.
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
  const [clicked, setClicked] = useState<T | null>(null);
  const [isPending, startTransition] = useTransition();

  // Only consulted while the switch is still in flight, so there's nothing to clean up when it
  // lands: `isPending` going false is what hands the display back to `value`.
  const navigatingTo = isPending ? clicked : null;
  const shown = navigatingTo ?? value;

  function select(id: T) {
    if (id === value) return;
    setClicked(id);
    startTransition(() => onChange(id));
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/40 p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const active = shown === tab.id;
        // Two different waits, and only one of them should hide a number: the count isn't known
        // yet, versus the view this tab opens is still arriving. Both sheen; only the first
        // replaces the count with a placeholder.
        const countLoading = tab.showCount === true && tab.count === undefined;
        const busy = countLoading || navigatingTo === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-busy={busy}
            title={tab.hint}
            disabled={disabled}
            onClick={() => select(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${sheenClass(busy)} ${
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
                {countLoading ? (
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
