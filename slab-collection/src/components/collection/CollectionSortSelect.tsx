"use client";

import {
  TEAM_PLAYERS_SORT,
  type GroupSortOption,
} from "@/lib/collection-paging";
import type { CollectionBrowseMode } from "@/lib/collection-filters";
import type { CollectionSortOption } from "@/lib/collection-sort";

/**
 * One sort control whose options follow the view.
 *
 * There used to be two: this one, offering card sorts, plus a separate control inside each grouped
 * view. In Sets or Teams the card sorts had nothing to order — you'd pick "Card #: low to high"
 * over a list of sets and nothing happened — while the control that actually worked was somewhere
 * else on the page. Sorting is one question; the answers just differ by what you're looking at.
 *
 * The values are the ones the API takes, not labels mapped onto them, so what's selected is what
 * the server was asked for.
 */
const CARD_SORTS: { value: CollectionSortOption; label: string }[] = [
  { value: "value_desc", label: "Value" },
  { value: "confidence_desc", label: "Price confidence" },
  { value: "card_number_asc", label: "Card #: low to high" },
  { value: "card_number_desc", label: "Card #: high to low" },
  { value: "alpha_asc", label: "Last name (A–Z)" },
];

/** Shared by every grouped view — these are `group_sort` values. */
const GROUP_SORTS: { value: GroupSortOption; label: string }[] = [
  { value: "-value", label: "Highest value" },
  { value: "-copies", label: "Most cards" },
  { value: "name", label: "Name (A–Z)" },
];

/** Only teams count distinct players, so only teams can order by them. */
const TEAM_EXTRA: { value: GroupSortOption; label: string }[] = [
  { value: TEAM_PLAYERS_SORT, label: "Most players" },
];

interface CollectionSortSelectProps {
  browse: CollectionBrowseMode;
  cardSort: CollectionSortOption;
  onCardSortChange: (sort: CollectionSortOption) => void;
  groupSort: GroupSortOption;
  onGroupSortChange: (sort: GroupSortOption) => void;
}

export function CollectionSortSelect({
  browse,
  cardSort,
  onCardSortChange,
  groupSort,
  onGroupSortChange,
}: CollectionSortSelectProps) {
  const grouped = browse !== "cards";
  const options = grouped
    ? [...GROUP_SORTS, ...(browse === "teams" ? TEAM_EXTRA : [])]
    : CARD_SORTS;

  return (
    <label className="flex items-center gap-2 text-sm text-slate-400">
      <span>Sort</span>
      {/* Fixed width, sized to the longest option, so the toolbar geometry is identical in every
          view. Left to auto, "Last name (A–Z)" and "Most cards" render at different widths and
          shift everything beside them on each switch. */}
      <select
        value={grouped ? groupSort : cardSort}
        onChange={(event) => {
          const next = event.target.value;
          if (grouped) onGroupSortChange(next as GroupSortOption);
          else onCardSortChange(next as CollectionSortOption);
        }}
        className="w-44 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-white"
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
