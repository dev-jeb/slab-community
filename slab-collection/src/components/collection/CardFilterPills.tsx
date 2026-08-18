import { sheenClass, SheenContent } from "@/components/ui/sheen";
import type { CollectionFilter } from "@/lib/collection-filters";

/**
 * The filter row that sits under the view tabs: card type, and — searching the catalog — whether
 * it's yours.
 *
 * Shared by both search scopes, which is why counts are optional. Your collection knows how many
 * autos are in it (the dashboard counts them), the catalog doesn't without asking for facets — and
 * a pill that can't say "22" is still a perfectly good filter. Omit `counts` and the badges go
 * away entirely; pass one whose value is undefined and it sheens until the number lands.
 *
 * Ownership is a pill here rather than a control of its own because it narrows results exactly
 * like Autos does — it doesn't change what you're looking at, which is what the view tabs above
 * are for. It's a separate group only because it answers a different question, so "my numbered
 * cards in this set" and "numbered cards I'm missing" are both reachable.
 */
export type OwnershipFilter = "any" | "owned" | "missing";

interface CardFilterPillsProps {
  activeFilter: CollectionFilter;
  onFilterChange: (filter: CollectionFilter) => void;
  /** Per-filter totals. Omit for a scope with no counts to show. */
  counts?: Partial<Record<CollectionFilter, number | undefined>>;
  /** Omit the pair to hide the ownership group (it's meaningless inside your own collection). */
  ownership?: OwnershipFilter;
  onOwnershipChange?: (ownership: OwnershipFilter) => void;
  isPending?: boolean;
}

const FILTERS: { id: CollectionFilter; label: string }[] = [
  { id: "auto", label: "Autos" },
  { id: "rookie", label: "Rookies" },
  { id: "numbered", label: "Numbered" },
];

const OWNERSHIP: { id: Exclude<OwnershipFilter, "any">; label: string }[] = [
  { id: "owned", label: "Owned" },
];

export function CardFilterPills({
  activeFilter,
  onFilterChange,
  counts,
  ownership,
  onOwnershipChange,
  isPending = false,
}: CardFilterPillsProps) {
  const showOwnership = ownership !== undefined && onOwnershipChange !== undefined;
  const anyActive = activeFilter !== "all" || (ownership ?? "any") !== "any";

  return (
    <section className="flex flex-wrap items-center gap-2">
      {/* Filters are pills, not cards, on purpose: the portfolio stats above are cards, and two
          grids of similar boxes read as one wall of numbers. A different shape says "these do
          something" and costs a fraction of the vertical space, which is what was pushing the
          actual cards below the fold. */}
      <span className="mr-1 text-xs uppercase tracking-wider text-slate-500">
        Filter
      </span>

      {FILTERS.map((item) => {
        const active = activeFilter === item.id;
        const count = counts?.[item.id];
        // undefined = not known yet, which renders as the loading sheen. It must NOT fall back to
        // 0: a confident "Autos 0" on a collection full of autos is worse than admitting we're
        // still counting.
        const loading = counts !== undefined && count === undefined;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(active ? "all" : item.id)}
            disabled={isPending}
            aria-busy={loading}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-2 text-sm transition disabled:opacity-60 ${sheenClass(
              loading,
            )} ${
              active
                ? "border-sky-400/60 bg-sky-400/10 text-sky-100"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
            }`}
          >
            <SheenContent block={false}>{item.label}</SheenContent>
            {counts !== undefined ? (
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
                  count
                )}
              </SheenContent>
            ) : null}
          </button>
        );
      })}

      {showOwnership ? (
        <>
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-slate-800" />
          {OWNERSHIP.map((item) => {
            const active = ownership === item.id;

            return (
              <button
                key={item.id}
                type="button"
                disabled={isPending}
                aria-pressed={active}
                onClick={() => onOwnershipChange(active ? "any" : item.id)}
                // Emerald, not sky: it's the same colour the tiles use for "you own this", so the
                // pill and the badge it filters on read as the same fact.
                className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
                  active
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </>
      ) : null}

      {anyActive ? (
        <button
          type="button"
          onClick={() => {
            onFilterChange("all");
            onOwnershipChange?.("any");
          }}
          className="ml-1 text-sm text-sky-400 transition hover:text-sky-300"
        >
          Clear
        </button>
      ) : null}
    </section>
  );
}
