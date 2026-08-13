"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { OwnedCopyRow } from "@/components/collection/OwnedCopyRow";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import {
  duplicateGroupsOnly,
  groupByCardUuid,
  sortDuplicateGroups,
  type DuplicateGroupSort,
} from "@/lib/collection-filters";
import { cardSubtitle, cardTitle, formatCurrency } from "@/lib/slab/format";
import type { CardCopyOut } from "@/lib/slab/types";

interface CollectionDuplicateGroupsProps {
  items: CardCopyOut[];
}

interface DuplicateBannerProps {
  group: ReturnType<typeof sortDuplicateGroups>[number];
  expanded: boolean;
  onToggle: () => void;
}

function DuplicateBanner({ group, expanded, onToggle }: DuplicateBannerProps) {
  const playerName = primarySubjectName(group.card?.subjects);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition ${
        expanded
          ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/20"
          : "border-slate-800 bg-slate-900/60 hover:border-sky-500/30 hover:bg-slate-900"
      }`}
    >
      <PlayerAvatar
        name={playerName}
        size="sm"
        className="shrink-0 border border-slate-700/80"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">
          {cardTitle(group.card)}
        </p>
        <p className="mt-0.5 truncate text-sm text-slate-400">
          {cardSubtitle(group.card)}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-5 gap-y-1 text-sm">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Copies</p>
          <p className="font-semibold text-emerald-300">×{group.totalCount}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Value</p>
          <p className="font-semibold text-white">
            {formatCurrency(String(group.totalValue))}
          </p>
        </div>
        <span className="text-xs text-sky-400">{expanded ? "Hide" : "Show"}</span>
      </div>
    </button>
  );
}

export function CollectionDuplicateGroups({ items }: CollectionDuplicateGroupsProps) {
  const [groupSort, setGroupSort] = useState<DuplicateGroupSort>("copies_desc");
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);

  const groups = useMemo(() => {
    const duplicates = duplicateGroupsOnly(groupByCardUuid(items));
    return sortDuplicateGroups(duplicates, groupSort);
  }, [items, groupSort]);

  useEffect(() => {
    setExpandedUuid(null);
  }, [groupSort]);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
        No duplicate cards in your collection.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {groups.length} card{groups.length === 1 ? "" : "s"} with multiple copies
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span>Sort</span>
          <select
            value={groupSort}
            onChange={(event) =>
              setGroupSort(event.target.value as DuplicateGroupSort)
            }
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="copies_desc">Most copies</option>
            <option value="value_desc">Highest value</option>
            <option value="alpha">Last name (A–Z)</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const expanded = expandedUuid === group.cardUuid;

          return (
            <section key={group.cardUuid} className="space-y-3">
              <DuplicateBanner
                group={group}
                expanded={expanded}
                onToggle={() =>
                  setExpandedUuid((current) =>
                    current === group.cardUuid ? null : group.cardUuid,
                  )
                }
              />

              {expanded ? (
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <Link
                    href={`/cards/${group.cardUuid}`}
                    className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
                  >
                    View card details →
                  </Link>
                  {group.copies.map((copy) => (
                    <OwnedCopyRow key={copy.uuid} copy={copy} />
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
