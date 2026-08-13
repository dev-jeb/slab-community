"use client";

import { useEffect, useMemo, useState } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import {
  groupBySet,
  sortSetGroups,
  type SetGroupSort,
} from "@/lib/collection-filters";
import { formatCurrency } from "@/lib/slab/format";
import type { CardCopyOut } from "@/lib/slab/types";

interface CollectionSetBannersProps {
  items: CardCopyOut[];
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
  totalValue: number;
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
            {formatCurrency(String(totalValue))}
          </p>
        </div>
        <span className="text-xs text-sky-400">{expanded ? "Hide" : "Show"}</span>
      </div>
    </button>
  );
}

export function CollectionSetBanners({ items }: CollectionSetBannersProps) {
  const [setSort, setSetSort] = useState<SetGroupSort>("cards_desc");
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  const groups = useMemo(
    () => sortSetGroups(groupBySet(items), setSort),
    [items, setSort],
  );

  useEffect(() => {
    setExpandedSet(null);
  }, [setSort]);

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
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span>Sort sets</span>
          <select
            value={setSort}
            onChange={(event) => setSetSort(event.target.value as SetGroupSort)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="cards_desc">Most cards</option>
            <option value="value_desc">Highest value</option>
            <option value="alpha">Set name (A–Z)</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const expanded = expandedSet === group.setName;
          const subtitle = setSubtitle(group);

          return (
            <section key={group.setName} className="space-y-3">
              <SetBanner
                setName={group.setName}
                subtitle={subtitle}
                cardCount={group.cardCount}
                totalValue={group.totalValue}
                expanded={expanded}
                onToggle={() =>
                  setExpandedSet((current) =>
                    current === group.setName ? null : group.setName,
                  )
                }
              />

              {expanded ? (
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  {group.copies.map((copy) => (
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
