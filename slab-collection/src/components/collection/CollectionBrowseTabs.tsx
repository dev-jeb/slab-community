"use client";

import { SegmentedTabs, type SegmentedTab } from "@/components/ui/SegmentedTabs";
import type { CollectionBrowseMode } from "@/lib/collection-filters";

/**
 * How a set of cards is presented — a flat list, or rolled up by set, team, duplicate, or
 * parallel family.
 *
 * This is a tab strip and not a chip row on purpose. "Sets" and "Teams" used to sit among Autos
 * and Rookies as if picking one meant the same kind of thing, but choosing "Teams" doesn't narrow
 * your collection, it reorganises it. Tabs are the control people already read as "change the
 * view", and putting them above the filters says the filters apply *inside* whichever tab is open.
 *
 * Both search scopes use it, which is why the mode list is a parameter: the catalog has no notion
 * of a duplicate (you can't own two of a card you don't own), and it counts its groups with facets
 * rather than up front, so it shows the same tabs without numbers.
 */
const MODE_LABELS: Record<CollectionBrowseMode, string> = {
  cards: "Cards",
  sets: "Sets",
  teams: "Teams",
  duplicates: "Duplicates",
  parallels: "Parallels",
};

const ALL_MODES: CollectionBrowseMode[] = [
  "cards",
  "sets",
  "teams",
  "duplicates",
  "parallels",
];

interface CollectionBrowseTabsProps {
  value: CollectionBrowseMode;
  onChange: (mode: CollectionBrowseMode) => void;
  /** Which modes this scope offers. Defaults to every one of them. */
  modes?: CollectionBrowseMode[];
  /** Group counts per mode; undefined renders as loading. Omit entirely for no counts. */
  counts?: Partial<Record<CollectionBrowseMode, number | undefined>>;
  disabled?: boolean;
}

export function CollectionBrowseTabs({
  value,
  onChange,
  modes = ALL_MODES,
  counts,
  disabled = false,
}: CollectionBrowseTabsProps) {
  const tabs: SegmentedTab<CollectionBrowseMode>[] = modes.map((mode) => ({
    id: mode,
    label: MODE_LABELS[mode],
    showCount: counts !== undefined,
    count: counts?.[mode],
  }));

  return (
    <SegmentedTabs
      tabs={tabs}
      value={value}
      onChange={onChange}
      ariaLabel="Browse mode"
      disabled={disabled}
    />
  );
}
