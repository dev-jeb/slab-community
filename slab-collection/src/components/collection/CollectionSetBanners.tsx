"use client";

import { useEffect, useState } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import { GroupSortSelect } from "@/components/collection/GroupSortSelect";
import { formatCurrency } from "@/lib/slab/format";
import type { GroupSortOption } from "@/lib/collection-paging";
import type { SetGroupOut } from "@/lib/slab/types";

interface CollectionSetBannersProps {
  /** Groups as the API rolled them up — already filtered, aggregated, and ordered. */
  groups: SetGroupOut[];
  sort: GroupSortOption;
  onSortChange: (sort: GroupSortOption) => void;
}

function setSubtitle(group: {
  brand?: string | null;
  season?: string | null;
  year?: number | null;
}): string {
  return [group.brand, group.season, group.year ? String(group.year) : null]
    .filter(Boolean)
    .join(" · ");
}

interface SetBannerProps {
  setName: string;
  subtitle: string;
  cardCount: number;
  totalValue?: string | null;
  expanded: boolean;
  onToggle: () => void;
}

function SetBanner({
  setName,
  subtitle,
  cardCount,
  totalValue,
  expanded,
  onToggle,
}: SetBannerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border px-5 py-4 text-left transition ${
        expanded
          ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/20"
          : "border-slate-800 bg-slate-900/60 hover:border-sky-500/30 hover:bg-slate-900"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{setName}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-sm text-slate-400">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-5 gap-y-1 text-sm">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Cards</p>
          <p className="font-semibold text-white">{cardCount}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Value</p>
          <p className="font-semibold text-white">
            {/* null = nothing in this set is priced. Unknown, not zero. */}
            {totalValue == null ? "—" : formatCurrency(totalValue)}
          </p>
        </div>
        <span className="text-xs text-sky-400">{expanded ? "Hide" : "Show"}</span>
      </div>
    </button>
  );
}

export function CollectionSetBanners({
  groups,
  sort,
  onSortChange,
}: CollectionSetBannersProps) {
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  // A new ordering renders different sets in the same positions, so a leftover expansion would
  // open a set the user didn't click.
  useEffect(() => {
    setExpandedSet(null);
  }, [sort]);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
        No set cards found in your collection.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {groups.length} set{groups.length === 1 ? "" : "s"} in your collection
        </p>
        <GroupSortSelect label="Sort sets" value={sort} onChange={onSortChange} />
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const expanded = expandedSet === group.set_uuid;

          return (
            <section key={group.set_uuid} className="space-y-3">
              <SetBanner
                setName={group.name}
                subtitle={setSubtitle(group)}
                cardCount={group.card_count}
                totalValue={group.total_value}
                expanded={expanded}
                onToggle={() =>
                  setExpandedSet((current) =>
                    current === group.set_uuid ? null : group.set_uuid,
                  )
                }
              />

              {expanded ? (
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  {(group.copies ?? []).map((copy) => (
                    <CardListRow key={copy.uuid} copy={copy} />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
