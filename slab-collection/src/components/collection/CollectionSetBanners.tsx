"use client";

import { useEffect, useState } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import { rowFromCopy } from "@/lib/card-row";
import { SheenBar, Sheen } from "@/components/ui/sheen";
import { useGroupCopies, useSetPricedShares } from "@/lib/use-group-copies";
import { formatCurrency, formatPricedShare } from "@/lib/slab/format";
import type { GroupSortOption } from "@/lib/collection-paging";
import { sortCopiesForGroupView } from "@/lib/collection-search";
import { SetAccentBar } from "@/components/collection/SetAccentBar";
import { setAccent } from "@/lib/set-accent";
import type { CardCopyOut, SetGroupOut } from "@/lib/slab/types";

interface CollectionSetBannersProps {
  /** Groups as the API rolled them up — already filtered, aggregated, and ordered. */
  groups: SetGroupOut[];
  /** Open this set's dropdown (from the dashboard Top sets link). */
  expandSlug?: string | null;
  /** Same Sort control that ordered the banners — applied to the open set's cards. */
  sort: GroupSortOption;
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

function copiesPricedShare(copies: CardCopyOut[] | undefined): number | null {
  if (!copies?.length) return null;
  const priced = copies.filter((copy) => copy.market?.fair_market_value).length;
  return priced / copies.length;
}

/**
 * The grouped endpoint sends `copies: []` when `include_copies` is false, even for sets that
 * have cards. Treat that as "not loaded" so expand still fetches; search results that already
 * attached matching copies must not refetch (that would drop the search).
 */
function copiesArePreloaded(group: SetGroupOut | undefined): boolean {
  if (!group?.copies) return false;
  if (group.copies.length > 0) return true;
  return (group.copy_count ?? 0) === 0 && (group.card_count ?? 0) === 0;
}

function uuidForSlug(groups: SetGroupOut[], slug?: string | null): string | null {
  if (!slug) return null;
  return groups.find((group) => group.set_slug === slug)?.set_uuid ?? null;
}

interface SetBannerProps {
  group: SetGroupOut;
  pricedShare: number | null;
  expanded: boolean;
  onToggle: () => void;
}

function SetBanner({
  group,
  pricedShare,
  expanded,
  onToggle,
}: SetBannerProps) {
  const subtitle = setSubtitle(group);
  const accent = setAccent(group.set_slug);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border px-5 py-4 text-left transition ${
        expanded
          ? "border-transparent"
          : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
      }`}
      style={
        expanded
          ? {
              borderColor: accent.border,
              backgroundColor: accent.wash,
              boxShadow: `0 0 0 1px ${accent.ring}`,
            }
          : undefined
      }
    >
      <SetAccentBar accentKey={group.set_slug} />
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-white">{group.name}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-sm text-slate-400">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-5 gap-y-1 text-sm">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Cards</p>
          <p className="font-semibold text-white">{group.card_count}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Value</p>
          <p className="font-semibold text-white">
            {group.total_value == null ? "—" : formatCurrency(group.total_value)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            % Priced
          </p>
          <p className="font-semibold text-white">
            {formatPricedShare(pricedShare)}
          </p>
        </div>
        <span className="text-xs text-sky-400">
          {expanded ? "Hide" : "Show"}
        </span>
      </div>
    </button>
  );
}

export function CollectionSetBanners({
  groups,
  expandSlug,
  sort,
}: CollectionSetBannersProps) {
  const [expandedSet, setExpandedSet] = useState<string | null>(() =>
    uuidForSlug(groups, expandSlug),
  );

  // Copies arrive on expand, not with the list — see useGroupCopies for what that saved.
  // Search results already carry the matching copies on each group, so expanding those
  // must not fetch the whole set (which would drop the search).
  const expandedGroup = groups.find((group) => group.set_uuid === expandedSet);
  const preloaded = copiesArePreloaded(expandedGroup);
  const { copies: fetched, loading, cache } = useGroupCopies(
    preloaded || !expandedGroup
      ? null
      : { set_slug: expandedGroup.set_slug },
  );
  const copies = preloaded ? expandedGroup?.copies : fetched;
  const summaryShares = useSetPricedShares(
    groups.filter((group) => !copiesArePreloaded(group)).map((group) => group.set_slug),
  );

  // A new ordering puts different rows in the same positions, so a stale expansion would open
  // something the user didn't click. Reset DURING render (the React-sanctioned pattern for
  // state-from-props), not in an effect — the effect version rendered the stale expansion first
  // and then re-rendered closed. Re-apply expandSlug so a dashboard link still opens after
  // the groups request lands.
  const [prevGroups, setPrevGroups] = useState(groups);
  const [prevExpandSlug, setPrevExpandSlug] = useState(expandSlug);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    const stillOpen =
      expandedSet && groups.some((group) => group.set_uuid === expandedSet)
        ? expandedSet
        : uuidForSlug(groups, expandSlug);
    if (stillOpen !== expandedSet) setExpandedSet(stillOpen);
  }
  if (expandSlug !== prevExpandSlug) {
    setPrevExpandSlug(expandSlug);
    setExpandedSet(uuidForSlug(groups, expandSlug));
  }

  useEffect(() => {
    if (!expandSlug || !expandedSet) return;
    document
      .getElementById(`set-group-${expandedSet}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [expandSlug, expandedSet]);

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
          const cached =
            cache[new URLSearchParams({ set_slug: group.set_slug }).toString()];
          const pricedShare =
            copiesPricedShare(
              copiesArePreloaded(group) ? group.copies : cached,
            ) ?? summaryShares[group.set_slug] ?? null;

          return (
            <section
              key={group.set_uuid}
              id={`set-group-${group.set_uuid}`}
              className="space-y-3"
            >
              <SetBanner
                group={group}
                pricedShare={pricedShare}
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
                    sortCopiesForGroupView(copies ?? [], sort).map((copy) => (
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
