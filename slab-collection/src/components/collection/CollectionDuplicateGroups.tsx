"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OwnedCopyRow } from "@/components/collection/OwnedCopyRow";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import { cardSubtitle, cardTitle, formatCurrency } from "@/lib/slab/format";
import type { DuplicateGroupOut } from "@/lib/slab/types";

interface CollectionDuplicateGroupsProps {
  /** Cards held more than once, as the API grouped them. */
  groups: DuplicateGroupOut[];
}

interface DuplicateBannerProps {
  group: DuplicateGroupOut;
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
          <p className="font-semibold text-emerald-300">×{group.copy_count}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Value</p>
          <p className="font-semibold text-white">
            {/* null = none of these copies are priced. Unknown, not zero. */}
            {group.total_value == null ? "—" : formatCurrency(group.total_value)}
          </p>
        </div>
        <span className="text-xs text-sky-400">{expanded ? "Hide" : "Show"}</span>
      </div>
    </button>
  );
}

export function CollectionDuplicateGroups({
  groups,
}: CollectionDuplicateGroupsProps) {
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);

  // A new ordering puts different rows in the same positions, so a stale expansion would open
  // something the user didn't click.
  useEffect(() => {
    setExpandedUuid(null);
  }, [groups]);

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
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const expanded = expandedUuid === group.card.uuid;

          return (
            <section key={group.card.uuid} className="space-y-3">
              <DuplicateBanner
                group={group}
                expanded={expanded}
                onToggle={() =>
                  setExpandedUuid((current) =>
                    current === group.card.uuid ? null : group.card.uuid,
                  )
                }
              />

              {expanded ? (
                <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <Link
                    href={`/cards/${group.card.uuid}`}
                    className="inline-flex text-sm text-sky-400 transition hover:text-sky-300"
                  >
                    View card details →
                  </Link>
                  {(group.copies ?? []).map((copy) => (
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
