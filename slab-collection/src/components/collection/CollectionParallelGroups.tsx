"use client";

import Link from "next/link";
import { useState } from "react";

import { OwnedCopyRow } from "@/components/collection/OwnedCopyRow";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import {
  cardFamilySubtitle,
  cardTitle,
  formatCurrency,
  printingLabel,
} from "@/lib/slab/format";
import type { CardCopyOut, CardOut, ParallelGroupOut } from "@/lib/slab/types";

interface CollectionParallelGroupsProps {
  groups: ParallelGroupOut[];
}

interface ParallelBannerProps {
  group: ParallelGroupOut;
  expanded: boolean;
  onToggle: () => void;
}

function copiesByPrinting(
  copies: CardCopyOut[],
): { card: CardOut; copies: CardCopyOut[] }[] {
  const grouped = new Map<string, CardCopyOut[]>();

  for (const copy of copies) {
    const current = grouped.get(copy.card_uuid) ?? [];
    current.push(copy);
    grouped.set(copy.card_uuid, current);
  }

  return [...grouped.values()]
    .map((groupCopies) => ({
      card: groupCopies[0]?.card,
      copies: groupCopies,
    }))
    .filter((group): group is { card: CardOut; copies: CardCopyOut[] } =>
      Boolean(group.card),
    )
    .sort((a, b) => {
      const aBase = !a.card.finish;
      const bBase = !b.card.finish;
      if (aBase !== bBase) return aBase ? -1 : 1;
      return printingLabel(a.card).localeCompare(printingLabel(b.card));
    });
}

function ParallelBanner({ group, expanded, onToggle }: ParallelBannerProps) {
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
          {cardFamilySubtitle(group.card)}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-5 gap-y-1 text-sm">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Printings
          </p>
          <p className="font-semibold text-emerald-300">×{group.printing_count}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Value</p>
          <p className="font-semibold text-white">
            {group.total_value == null ? "—" : formatCurrency(group.total_value)}
          </p>
        </div>
        <span className="text-xs text-sky-400">{expanded ? "Hide" : "Show"}</span>
      </div>
    </button>
  );
}

export function CollectionParallelGroups({
  groups,
}: CollectionParallelGroupsProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // A new ordering puts different rows in the same positions, so a stale expansion would open
  // something the user didn't click. Reset DURING render (the React-sanctioned pattern for
  // state-from-props), not in an effect — the effect version rendered the stale expansion first
  // and then re-rendered closed.
  const [prevGroups, setPrevGroups] = useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setExpandedKey(null);
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
        No parallel cards in your collection.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {groups.map((group) => {
          const expanded = expandedKey === group.family_key;

          return (
            <section key={group.family_key} className="space-y-3">
              <ParallelBanner
                group={group}
                expanded={expanded}
                onToggle={() =>
                  setExpandedKey((current) =>
                    current === group.family_key ? null : group.family_key,
                  )
                }
              />

              {expanded ? (
                <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  {copiesByPrinting(group.copies ?? []).map(({ card, copies }) => (
                    <div key={card.uuid} className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-200">
                          {printingLabel(card)}
                          {card.print_run ? (
                            <span className="ml-2 text-slate-500">
                              /{card.print_run}
                            </span>
                          ) : null}
                        </p>
                        <Link
                          href={`/cards/${card.uuid}`}
                          className="shrink-0 text-sm text-sky-400 transition hover:text-sky-300"
                        >
                          View card →
                        </Link>
                      </div>
                      {copies.map((copy) => (
                        <OwnedCopyRow key={copy.uuid} copy={copy} />
                      ))}
                    </div>
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
