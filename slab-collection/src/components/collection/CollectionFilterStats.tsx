import { sheenClass, SheenContent } from "@/components/ui/sheen";
import type { CollectionFilter } from "@/lib/collection-filters";
import type { DashboardStats } from "@/lib/slab/types";


interface CollectionFilterStatsProps {
  stats: DashboardStats | null;
  activeFilter: CollectionFilter;
  onFilterChange: (filter: CollectionFilter) => void;
  isPending?: boolean;
}

interface StatItem {
  id: CollectionFilter;
  label: string;
  /** undefined = still loading. The chip stays clickable; it just doesn't claim a number yet. */
  value: number | undefined;
  hint?: string;
}

function buildStatItems(stats: DashboardStats | null): StatItem[] {
  return [
    { id: "auto", label: "Autos", value: stats?.autos },
    { id: "rookie", label: "Rookies", value: stats?.rookies },
    {
      id: "numbered",
      label: "Numbered",
      value: stats?.numbered,
    },
  ];
}

export function CollectionFilterStats({
  stats,
  activeFilter,
  onFilterChange,
  isPending = false,
}: CollectionFilterStatsProps) {
  const items = buildStatItems(stats);

  function handleClick(id: CollectionFilter) {
    onFilterChange(activeFilter === id ? "all" : id);
  }

  return (
    <section className="flex flex-wrap items-center gap-2">
      {/* Filters are pills, not cards, on purpose: the portfolio stats above are cards, and two
          grids of similar boxes read as one wall of numbers. A different shape says "these do
          something" and costs a fraction of the vertical space, which is what was pushing the
          actual cards below the fold. */}
      <span className="mr-1 text-xs uppercase tracking-wider text-slate-500">
        Filter
      </span>

      {items.map((item) => {
        const active = activeFilter === item.id;
        const loading = item.value === undefined;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            disabled={isPending}
            aria-busy={loading}
            aria-pressed={active}
            title={item.hint}
            className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-2 text-sm transition disabled:opacity-60 ${sheenClass(
              loading,
            )} ${
              active
                ? "border-sky-400/60 bg-sky-400/10 text-sky-100"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
            }`}
          >
            <SheenContent block={false}>{item.label}</SheenContent>
            <SheenContent
              block={false}
              className={`min-w-[1.75rem] rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                active ? "bg-sky-400/20 text-sky-100" : "bg-slate-800 text-white"
              }`}
            >
              {loading ? (
                <>
                  <span className="sr-only">
                    Counting {item.label.toLowerCase()}
                  </span>
                  {/* Holds the badge's width so the pill doesn't jump when the number lands. */}
                  <span aria-hidden="true">&nbsp;</span>
                </>
              ) : (
                item.value
              )}
            </SheenContent>
          </button>
        );
      })}

      {activeFilter !== "all" ? (
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className="ml-1 text-sm text-sky-400 transition hover:text-sky-300"
        >
          Clear
        </button>
      ) : null}
    </section>
  );
}
