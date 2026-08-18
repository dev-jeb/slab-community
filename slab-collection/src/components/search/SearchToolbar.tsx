"use client";

import type { ReactNode } from "react";

/**
 * The one control band every search scope wears.
 *
 * My Collection, Catalog and Sets are the same act — type something, narrow it, look at what came
 * back — so they should not each invent a layout. This owns the geometry and the wording: the
 * search box and its button on the left with sort and the view toggle beneath, whatever you're
 * looking at on the right. A scope passes only the controls that mean something to it (Sets has no
 * card filters; the catalog has no duplicates), and everything else lines up by construction.
 *
 * It stacks on mobile rather than hiding behind a filters sheet. There used to be one sheet, in the
 * collection view only — a second copy of the same controls that the other scopes never got, and
 * that could drift from the row it mirrored.
 */
interface SearchToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  /** Same shape everywhere: "Search X — a, b, c…". Name what this scope actually searches. */
  placeholder: string;
  isPending?: boolean;
  /** Sort control — use SortSelect unless the options depend on the view. */
  sort?: ReactNode;
  viewToggle?: ReactNode;
  /** What you're looking at: the Cards / Sets / Teams strip. */
  tabs?: ReactNode;
  /** What's narrowed out of it: the filter pills. */
  filters?: ReactNode;
}

export function SearchToolbar({
  query,
  onQueryChange,
  onSubmit,
  placeholder,
  isPending = false,
  sort,
  viewToggle,
  tabs,
  filters,
}: SearchToolbarProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:gap-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex w-full min-w-0 flex-col gap-2 md:max-w-xl md:flex-1"
      >
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white outline-none focus:border-sky-500/50"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {isPending ? "Searching…" : "Search"}
          </button>
        </div>

        {sort || viewToggle ? (
          <div className="flex flex-wrap items-center gap-3">
            {sort}
            {viewToggle}
          </div>
        ) : null}
      </form>

      {tabs || filters ? (
        <div className="flex w-full shrink-0 flex-col items-start gap-2 md:w-auto md:items-end">
          {tabs}
          {filters}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The plain sort control. Fixed width, sized to the longest option, so the toolbar geometry is
 * identical in every scope — left to auto, "Last name (A–Z)" and "Most cards" render at different
 * widths and shift everything beside them on each switch.
 */
export function SortSelect<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-400">
      <span>Sort</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        disabled={disabled}
        className="w-44 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Grid or list. Kept in the layout when a view can't use it, just hidden, so nothing reflows. */
export function ViewToggleGroup({
  view,
  onChange,
  hidden = false,
}: {
  view: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
  hidden?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 ${hidden ? "invisible" : ""}`}
      aria-hidden={hidden}
    >
      {(["grid", "list"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-lg border px-3 py-2 text-sm capitalize ${
            view === mode
              ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
              : "border-slate-800 text-slate-400 hover:border-slate-600"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

/** One empty state, so "nothing matched" reads the same wherever you are. */
export function EmptyResults({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
      {children}
    </div>
  );
}

/** One waiting state, so every scope looks the same shape while its request is out. */
export function ResultsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="sheen h-16 rounded-xl border border-slate-800 bg-slate-900/40"
        />
      ))}
    </div>
  );
}

/** One paging footer. */
export function LoadMore({
  loaded,
  total,
  isPending,
  onLoadMore,
}: {
  loaded: number;
  total: number;
  isPending: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <p className="text-xs text-slate-500">
        Showing {loaded} of {total}
      </p>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isPending}
        className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-3 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/80 disabled:opacity-60"
      >
        {isPending ? "Loading…" : "Load more"}
      </button>
    </div>
  );
}
