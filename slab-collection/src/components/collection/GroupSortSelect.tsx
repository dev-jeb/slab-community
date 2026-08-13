"use client";

import type { GroupSortOption } from "@/lib/collection-paging";
import type { GroupSort } from "@/lib/slab/types";

/**
 * The ordering control shared by every grouped view.
 *
 * These are the API's `group_sort` values verbatim rather than labels mapped onto them, so the
 * order on screen is the order the server produced — the sets, duplicates, and teams views can't
 * drift into three slightly different meanings of "most".
 */
const OPTIONS: { value: GroupSort; label: string }[] = [
  { value: "-value", label: "Highest value" },
  { value: "-copies", label: "Most copies" },
  { value: "name", label: "Name (A–Z)" },
];

interface GroupSortSelectProps {
  label: string;
  value: GroupSortOption;
  onChange: (sort: GroupSortOption) => void;
  /** Extra options one view can offer, e.g. teams sorting by player count. */
  extraOptions?: { value: GroupSortOption; label: string }[];
}

export function GroupSortSelect({
  label,
  value,
  onChange,
  extraOptions = [],
}: GroupSortSelectProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-400">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as GroupSortOption)}
        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {extraOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
