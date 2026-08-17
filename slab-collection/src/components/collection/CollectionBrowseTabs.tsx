"use client";

import { SegmentedTabs, type SegmentedTab } from "@/components/ui/SegmentedTabs";
import type { CollectionBrowseMode } from "@/lib/collection-filters";

/**
 * How the collection is presented — a flat list of cards, or rolled up by set, team,
 * duplicate, or parallel family.
 *
 * This is a tab strip and not a chip row on purpose. "Sets" and "Teams" used to sit among Autos
 * and Rookies as if picking one meant the same kind of thing, but choosing "Teams" doesn't narrow
 * your collection, it reorganises it. Tabs are the control people already read as "change the
 * view", and putting them above the filters says the filters apply *inside* whichever tab is open.
 */
const MODES: { id: CollectionBrowseMode; label: string; hint: string }[] = [
  { id: "cards", label: "Cards", hint: "Every card, one tile each" },
  { id: "sets", label: "Sets", hint: "Grouped by the product they came from" },
  { id: "teams", label: "Teams", hint: "Grouped by the team on the card" },
  { id: "duplicates", label: "Duplicates", hint: "Cards you own more than one of" },
  {
    id: "parallels",
    label: "Parallels",
    hint: "Finishes and variants you own",
  },
];

interface CollectionBrowseTabsProps {
  value: CollectionBrowseMode;
  onChange: (mode: CollectionBrowseMode) => void;
  /** Group counts per mode; undefined renders as loading. `cards` uses the collection total. */
  counts: Partial<Record<CollectionBrowseMode, number | undefined>>;
  disabled?: boolean;
}

export function CollectionBrowseTabs({
  value,
  onChange,
  counts,
  disabled = false,
}: CollectionBrowseTabsProps) {
  const tabs: SegmentedTab<CollectionBrowseMode>[] = MODES.map((mode) => ({
    ...mode,
    showCount: true,
    count: counts[mode.id],
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
