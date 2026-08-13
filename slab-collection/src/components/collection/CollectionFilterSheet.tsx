"use client";

import { sheenClass, SheenBar, SheenContent } from "@/components/ui/sheen";
import type {
  CollectionBrowseMode,
  CollectionFilter,
} from "@/lib/collection-filters";
import type { CollectionSortOption } from "@/lib/collection-sort";
import type { DashboardStats } from "@/lib/slab/types";

interface CollectionFilterSheetProps {
  open: boolean;
  onClose: () => void;
  sort: CollectionSortOption;
  onSortChange: (sort: CollectionSortOption) => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  browse: CollectionBrowseMode;
  onBrowseChange: (mode: CollectionBrowseMode) => void;
  filter: CollectionFilter;
  onFilterChange: (filter: CollectionFilter) => void;
  stats: DashboardStats | null;
  isPending?: boolean;
  showViewToggle?: boolean;
}

const BROWSE_OPTIONS: { id: CollectionBrowseMode; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "sets", label: "Sets" },
  { id: "teams", label: "Teams" },
  { id: "duplicates", label: "Duplicates" },
];

// undefined = not known yet, which renders as the loading sheen. It must NOT fall back to 0: a
// confident "Autos 0" on a collection full of autos is worse than admitting we're loading.
const FILTER_OPTIONS: {
  id: CollectionFilter;
  label: string;
  value: (stats: DashboardStats | null) => number | undefined;
}[] = [
  { id: "auto", label: "Autos", value: (stats) => stats?.autos },
  { id: "rookie", label: "Rookies", value: (stats) => stats?.rookies },
  { id: "numbered", label: "Numbered", value: (stats) => stats?.numbered },
];


export function CollectionFilterSheet({
  open,
  onClose,
  sort,
  onSortChange,
  view,
  onViewChange,
  browse,
  onBrowseChange,
  filter,
  onFilterChange,
  stats,
  isPending = false,
  showViewToggle = true,
}: CollectionFilterSheetProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />
      <section className="fixed inset-x-0 bottom-16 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-950 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Filters & sort</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-sky-400"
          >
            Done
          </button>
        </div>

        <div className="space-y-5">
          <label className="block text-sm text-slate-400">
            Sort by
            <select
              value={sort}
              onChange={(event) =>
                onSortChange(event.target.value as CollectionSortOption)
              }
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white"
            >
              <option value="value_desc">Value</option>
              <option value="confidence_desc">Price confidence</option>
              <option value="card_number_asc">Card #: low to high</option>
              <option value="card_number_desc">Card #: high to low</option>
              <option value="alpha_asc">Last name (A–Z)</option>
            </select>
          </label>

          {showViewToggle ? (
            <div>
              <p className="text-sm text-slate-400">View</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <FilterChip
                  active={view === "list"}
                  onClick={() => onViewChange("list")}
                  label="List"
                />
                <FilterChip
                  active={view === "grid"}
                  onClick={() => onViewChange("grid")}
                  label="Grid"
                />
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-sm text-slate-400">Browse</p>
            <p className="text-xs text-slate-500">
              How your collection is shown. Filters below apply inside it.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BROWSE_OPTIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  active={browse === option.id}
                  onClick={() => {
                    onBrowseChange(option.id);
                    onClose();
                  }}
                  label={option.label}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400">Filter</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {FILTER_OPTIONS.map((option) => {
                const active = filter === option.id;
                const count = option.value(stats);
                const loading = count === undefined;

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isPending}
                    aria-busy={loading}
                    aria-pressed={active}
                    onClick={() => {
                      onFilterChange(active ? "all" : option.id);
                      onClose();
                    }}
                    className={`rounded-xl border px-3 py-3 text-left disabled:opacity-60 ${sheenClass(
                      loading,
                    )} ${
                      active
                        ? "border-sky-400/50 bg-sky-400/10"
                        : "border-slate-800 bg-slate-900/60"
                    }`}
                  >
                    <SheenContent>
                      <span className="block text-sm text-white">{option.label}</span>
                      {loading ? (
                        <>
                          <span className="sr-only">
                            Counting {option.label.toLowerCase()}
                          </span>
                          <span className="mt-1.5 mb-0.5 block">
                            <SheenBar className="h-2.5 w-10" />
                          </span>
                        </>
                      ) : (
                        <span className="mt-1 block text-xs text-slate-500">{count}</span>
                      )}
                    </SheenContent>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm ${
        active
          ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
          : "border-slate-800 text-slate-400"
      }`}
    >
      {label}
    </button>
  );
}
