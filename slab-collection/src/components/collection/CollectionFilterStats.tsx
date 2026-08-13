import { SkateLoader } from "@/components/collection/SkateLoader";
import type { CollectionCategoryFilter } from "@/lib/collection-filters";
import type { DashboardStats } from "@/lib/slab/types";

const FILTER_LABELS: Record<CollectionCategoryFilter, string> = {
  all: "All cards",
  auto: "Autos",
  rookie: "Rookies",
  numbered: "Numbered",
  teams: "Team cards",
  by_set: "Sets",
  duplicates: "Duplicates",
};

interface CollectionFilterStatsProps {
  stats: DashboardStats | null;
  activeFilter: CollectionCategoryFilter;
  onFilterChange: (filter: CollectionCategoryFilter) => void;
  isPending?: boolean;
  setCount?: number;
  duplicateCount?: number;
}

interface StatItem {
  id: CollectionCategoryFilter;
  label: string;
  /** undefined = still loading. The chip stays clickable; it just doesn't claim a number yet. */
  value: number | undefined;
  hint?: string;
}

function buildStatItems(
  stats: DashboardStats | null,
  setCount?: number,
  duplicateCount?: number,
): StatItem[] {
  return [
    { id: "auto", label: "Autos", value: stats?.autos },
    { id: "rookie", label: "Rookies", value: stats?.rookies },
    {
      id: "numbered",
      label: "Numbered",
      value: stats?.numbered,
    },
    {
      id: "teams",
      label: "Teams",
      value: stats?.teams,
    },
    {
      id: "by_set",
      label: "Sets",
      value: setCount,
      hint: "Browse by product",
    },
    {
      id: "duplicates",
      label: "Duplicates",
      value: duplicateCount,
      hint: "Multiple copies",
    },
  ];
}

export function CollectionFilterStats({
  stats,
  activeFilter,
  onFilterChange,
  isPending = false,
  setCount,
  duplicateCount,
}: CollectionFilterStatsProps) {
  const items = buildStatItems(stats, setCount, duplicateCount);

  function handleClick(id: CollectionCategoryFilter) {
    onFilterChange(activeFilter === id ? "all" : id);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white">Browse by type</h2>
          <p className="text-xs text-slate-500">
            Click a stat to filter your collection
            {activeFilter !== "all" ? (
              <span className="text-sky-400">
                {" "}
                · showing {FILTER_LABELS[activeFilter].toLowerCase()}
              </span>
            ) : null}
          </p>
        </div>
        {activeFilter !== "all" ? (
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className="text-sm text-sky-400 transition hover:text-sky-300"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => {
          const active = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              disabled={isPending}
              className={`rounded-xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                active
                  ? "border-sky-400/50 bg-sky-400/10"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80"
              }`}
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {item.value ?? (
                  <SkateLoader
                    label={`Counting ${item.label.toLowerCase()}`}
                    className="text-lg"
                  />
                )}
              </p>
              {item.hint ? (
                <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
