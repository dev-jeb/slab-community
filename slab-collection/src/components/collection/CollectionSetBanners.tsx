"use client";

import { useState } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import { rowFromCopy } from "@/lib/card-row";
import { SheenBar, Sheen } from "@/components/ui/sheen";
import { useGroupCopies } from "@/lib/use-group-copies";
import { formatCurrency } from "@/lib/slab/format";
import type { SetGroupOut } from "@/lib/slab/types";

interface CollectionSetBannersProps {
  /** Groups as the API rolled them up — already filtered, aggregated, and ordered. */
  groups: SetGroupOut[];
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
}: CollectionSetBannersProps) {
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  // Copies arrive on expand, not with the list — see useGroupCopies for what that saved.
  // Search results already carry the matching copies on each group, so expanding those
  // must not fetch the whole set (which would drop the search).
  const expandedGroup = groups.find((group) => group.set_uuid === expandedSet);
  const preloaded = expandedGroup?.copies;
  const { copies: fetched, loading } = useGroupCopies(
    preloaded !== undefined || !expandedGroup
      ? null
      : { set_slug: expandedGroup.set_slug },
  );
  const copies = preloaded ?? fetched;

  // A new ordering puts different rows in the same positions, so a stale expansion would open
  // something the user didn't click. Reset DURING render (the React-sanctioned pattern for
  // state-from-props), not in an effect — the effect version rendered the stale expansion first
  // and then re-rendered closed.
  const [prevGroups, setPrevGroups] = useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setExpandedSet(null);
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
        No set cards found in your collection.
      </div>
    );
  }

  return (
    <div className="space-y-4">

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
                  {loading ? (
                    <Sheen loading label={`Loading ${group.name}`} className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <SheenBar key={index} className="h-12 w-full" />
                      ))}
                    </Sheen>
                  ) : (
                    (copies ?? []).map((copy) => (
                      <CardListRow key={copy.uuid} row={rowFromCopy(copy)} />
                    ))
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
