"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import { CardTile } from "@/components/collection/CardTile";
import { CollectionDuplicateGroups } from "@/components/collection/CollectionDuplicateGroups";
import { CollectionFilterSheet } from "@/components/collection/CollectionFilterSheet";
import { CollectionFilterStats } from "@/components/collection/CollectionFilterStats";
import { CollectionSetBanners } from "@/components/collection/CollectionSetBanners";
import { CollectionTeamGroups } from "@/components/collection/CollectionTeamGroups";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { SummaryBar } from "@/components/collection/SummaryBar";
import { formatApiDetail } from "@/lib/api-errors";
import {
  ownedCountByCardUuid,
  type CollectionBrowseMode,
  type CollectionFilter,
} from "@/lib/collection-filters";
import { CollectionBrowseTabs } from "@/components/collection/CollectionBrowseTabs";
import { CollectionSortSelect } from "@/components/collection/CollectionSortSelect";
import { GroupSkeleton } from "@/components/collection/GroupSkeleton";
import {
  collectionFetchKey,
  collectionParams,
  groupFilterParams,
  groupKindFor,
  TEAM_PLAYERS_SORT,
  usesServerPaging,
  type GroupSortOption,
} from "@/lib/collection-paging";
import { primarySubjectName } from "@/lib/names";
import { prefetchPlayerImages } from "@/lib/player-image-cache";
import {
  sortCollectionCopies,
  type CollectionSortOption,
} from "@/lib/collection-sort";
import type {
  CollectionResult,
  DuplicateGroupOut,
  GroupResult,
  SetGroupOut,
  TeamGroupOut,
} from "@/lib/slab/types";
import type { DashboardStats } from "@/lib/slab/types";

type ViewMode = "grid" | "list";

/** What the first summary stat is counting — groups in a grouped view, copies in Cards. */
const TOTAL_LABELS: Record<CollectionBrowseMode, string> = {
  cards: "Cards shown",
  sets: "Sets shown",
  teams: "Teams shown",
  duplicates: "Duplicates shown",
};

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}

export function CollectionView() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<CollectionSortOption>("value_desc");
  const [view, setView] = useState<ViewMode>("grid");
  // Two independent axes: what you're looking at, and what's been narrowed out of it.
  const [browse, setBrowse] = useState<CollectionBrowseMode>("cards");
  const [filter, setFilter] = useState<CollectionFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [result, setResult] = useState<CollectionResult | null>(null);
  const [groups, setGroups] = useState<GroupResult<unknown> | null>(null);
  const [groupSort, setGroupSort] = useState<GroupSortOption>("-value");
  // Which request the data on screen came from. Anything else means what's rendered belongs to
  // a previous view, so counts and empty states from it would be about the wrong thing.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobileViewport()) {
      setView("list");
    }
  }, []);

  // Three shapes of request, decided by the browse mode and sort (see collection-paging):
  //   grouped   -> its own endpoint, which rolls up and pages the GROUPS
  //   paged     -> one page of copies, filtered and ordered by the API
  //   full load -> everything, for the two sorts the API can't express
  const groupKind = groupKindFor(browse);
  const paged = usesServerPaging(browse, sort);
  const fetchKey = groupKind
    ? `group|${groupKind}|${filter}|${groupSort}|${submittedQuery}`
    : collectionFetchKey(filter, sort, submittedQuery);

  const fetchPage = useCallback(
    async (offset: number | null): Promise<CollectionResult | null> => {
      const params = collectionParams({
        search: submittedQuery || undefined,
        filter,
        sort,
        offset,
      });

      const response = await fetch(`/api/collection?${params.toString()}`);

      if (response.status === 503) {
        setNeedsSetup(true);
        return null;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: unknown };
        setError(formatApiDetail(body.detail, "Failed to load collection"));
        return null;
      }

      setNeedsSetup(false);
      return (await response.json()) as CollectionResult;
    },
    [filter, sort, submittedQuery],
  );

  const fetchGroups = useCallback(async (): Promise<GroupResult<unknown> | null> => {
    if (!groupKind) return null;

    const response = await fetch(`/api/collection/groups/${groupKind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        q: submittedQuery || undefined,
        // The filter narrows the copies BEFORE they're rolled up, so "rookies, by set" is one
        // request rather than a set list the browser has to re-filter.
        ...groupFilterParams(filter),
        // "Most players" is ordered in the teams view itself; the server has no such key, so ask
        // for the nearest thing and let that view refine it.
        group_sort: groupSort === TEAM_PLAYERS_SORT ? "-copies" : groupSort,
        // Sets and teams fill a group in on expand (useGroupCopies), which took those lists
        // from ~9s to ~0.7s. Duplicates keeps its copies: the list is small, and a duplicate
        // group is one card, which the collection filters can't single out on their own.
        include_copies: groupKind === "duplicates",
      }),
    });

    if (response.status === 503) {
      setNeedsSetup(true);
      return null;
    }

    if (!response.ok) {
      const body = (await response.json()) as { detail?: unknown };
      setError(formatApiDetail(body.detail, "Failed to load groups"));
      return null;
    }

    setNeedsSetup(false);
    return (await response.json()) as GroupResult<unknown>;
  }, [filter, groupKind, groupSort, submittedQuery]);

  const loadCollection = useCallback(() => {
    startTransition(async () => {
      setError(null);

      if (groupKind) {
        const data = await fetchGroups();
        if (data) setGroups(data);
        // Marked done even on failure: the error banner explains what happened, and leaving a
        // skeleton spinning forever would suggest the request is still coming.
        setLoadedKey(fetchKey);
        return;
      }

      const data = await fetchPage(paged ? 0 : null);
      if (data) setResult(data);
      setLoadedKey(fetchKey);
    });
  }, [fetchGroups, fetchKey, fetchPage, groupKind, paged]);

  const loadMore = useCallback(() => {
    if (!paged || !result) return;

    const loaded = result.items?.length ?? 0;
    if (loaded >= (result.total ?? 0)) return;

    startTransition(async () => {
      setError(null);
      const data = await fetchPage(loaded);
      if (!data) return;

      setResult((previous) => {
        if (!previous) return data;
        return {
          ...previous,
          total: data.total ?? previous.total,
          summary: data.summary ?? previous.summary,
          items: [...(previous.items ?? []), ...(data.items ?? [])],
        };
      });
    });
  }, [fetchPage, paged, result]);

  useEffect(() => {
    startTransition(async () => {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        setStats((await response.json()) as DashboardStats);
      }
    });
  }, []);

  useEffect(() => {
    loadCollection();
    // Keyed on fetchKey, not on loadCollection: switching between two browser-side sorts leaves
    // the server response identical, so it must not refire the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  useEffect(() => {
    if (!result?.items?.length) return;

    const names = [
      ...new Set(
        result.items
          .map((copy) => primarySubjectName(copy.card?.subjects))
          .filter(Boolean),
      ),
    ];

    void prefetchPlayerImages(names);
  }, [result?.items]);

  const items = useMemo(() => {
    const loaded = result?.items ?? [];
    // A paged response is already filtered and ordered by the API. Re-sorting it here would only
    // reorder the rows that happen to be loaded, which is worse than leaving it alone.
    if (paged) return loaded;
    return sortCollectionCopies(loaded, sort);
  }, [result?.items, sort, paged]);

  // True from the moment the inputs change until that request's data is on screen — including
  // the first load, when there's nothing to be stale.
  const awaitingData = loadedKey !== fetchKey;

  const loadedCount = result?.items?.length ?? 0;
  const hasMore = paged && loadedCount < (result?.total ?? 0);

  // Whole-collection counts, so they're right no matter how little of it is loaded. These used to
  // be derived from the rows on hand, which meant they were either absent while paging or, worse,
  // computed off a single page.
  const uniqueSetCount = stats?.sets;
  const duplicateCount = stats?.duplicates;

  const ownedTotals = useMemo(
    () => ownedCountByCardUuid(result?.items ?? []),
    [result?.items],
  );

  // For a grouped view this is the number of groups, which is what those views label.
  const displayTotal = groupKind
    ? (groups?.total ?? 0)
    : paged
      ? (result?.total ?? 0)
      : items.length;

  const highlightCardNumber =
    sort === "card_number_asc" || sort === "card_number_desc";

  // Grid/list is a card-layout choice; the grouped views render their own shapes.
  const showViewToggle = browse === "cards";

  // Each handler only moves state; the effect above decides whether that state change actually
  // needs a new request. Previously these fired a fetch AND changed state, which refetched twice.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  function handleSortChange(nextSort: CollectionSortOption) {
    setSort(nextSort);
  }

  function handleFilterChange(nextFilter: CollectionFilter) {
    setFilter(nextFilter);
  }

  function handleBrowseChange(nextBrowse: CollectionBrowseMode) {
    setBrowse(nextBrowse);
  }

  if (needsSetup) {
    return <SetupPrompt />;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-slate-800 bg-[#0b1120]/95 px-4 py-3 backdrop-blur md:hidden">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search collection…"
            className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500/50"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-sky-500 px-4 py-3 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          >
            Go
          </button>
        </form>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200"
        >
          Filters & sort
          {filter !== "all" ? (
            <span className="ml-2 text-sky-400">· filtered</span>
          ) : null}
        </button>
      </div>

      <CollectionFilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sort={sort}
        onSortChange={handleSortChange}
        view={view}
        onViewChange={setView}
        browse={browse}
        onBrowseChange={handleBrowseChange}
        filter={filter}
        onFilterChange={handleFilterChange}
        stats={stats}
        isPending={isPending}
        showViewToggle={showViewToggle}
      />

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      {result || groups ? (
        <>
          <SummaryBar
            summary={result?.summary}
            total={awaitingData ? undefined : displayTotal}
            totalLabel={TOTAL_LABELS[browse]}
          />

          {/* One control band: what you're searching and sorting on the left, what you're
              looking at on the right. Both were full-width rows before, stacked, which left a
              wide empty gutter beside the pills and pushed the cards down twice. */}
          <div className="hidden items-start justify-between gap-6 md:flex">
            <form
              onSubmit={handleSubmit}
              className="flex min-w-0 max-w-xl flex-1 flex-col gap-2"
            >
              <div className="flex gap-2">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search player, set, or card number…"
                  className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white outline-none focus:border-sky-500/50"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                >
                  {isPending ? "Searching…" : "Search"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <CollectionSortSelect
                  browse={browse}
                  cardSort={sort}
                  onCardSortChange={handleSortChange}
                  groupSort={groupSort}
                  onGroupSortChange={setGroupSort}
                />

                {/* Kept in the layout when it doesn't apply, just hidden. Unmounting it made
                    the row reflow every time you switched between Cards and a grouped view. */}
                <div
                  className={`flex gap-2 ${showViewToggle ? "" : "invisible"}`}
                  aria-hidden={!showViewToggle}
                >
                  <ViewToggle
                    active={view === "grid"}
                    onClick={() => setView("grid")}
                    label="Grid"
                  />
                  <ViewToggle
                    active={view === "list"}
                    onClick={() => setView("list")}
                    label="List"
                  />
                </div>
              </div>
            </form>

            <div className="flex shrink-0 flex-col items-end gap-2">
            <CollectionBrowseTabs
              value={browse}
              onChange={handleBrowseChange}
              counts={{
                cards: stats?.total_cards,
                sets: uniqueSetCount,
                teams: stats?.teams,
                duplicates: duplicateCount,
              }}
              disabled={isPending}
            />
            <CollectionFilterStats
              stats={stats}
              activeFilter={filter}
              onFilterChange={handleFilterChange}
              isPending={isPending}
            />
            </div>
          </div>

          {groupKind && awaitingData ? (
            <GroupSkeleton />
          ) : groupKind === "teams" ? (
            <CollectionTeamGroups
              groups={(groups?.items ?? []) as TeamGroupOut[]}
              sort={groupSort}
            />
          ) : groupKind === "sets" ? (
            <CollectionSetBanners
              groups={(groups?.items ?? []) as SetGroupOut[]}
            />
          ) : groupKind === "duplicates" ? (
            <CollectionDuplicateGroups
              groups={(groups?.items ?? []) as DuplicateGroupOut[]}
            />
          ) : awaitingData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="sheen aspect-[3/5] rounded-xl border border-slate-800 bg-slate-900/40"
                />
              ))}
            </div>
          ) : items.length > 0 ? (
            view === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((copy) => (
                  <CardTile
                    key={copy.uuid}
                    copy={copy}
                    highlightChecklist={highlightCardNumber}
                    ownedTotal={ownedTotals.get(copy.card_uuid)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((copy) => (
                  <CardListRow
                    key={copy.uuid}
                    copy={copy}
                    highlightChecklist={highlightCardNumber}
                    ownedTotal={ownedTotals.get(copy.card_uuid)}
                    compact={isMobile}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
              {filter === "all"
                ? "No cards found. Try a different search or sort."
                : "No cards match this filter."}
            </div>
          )}

          {hasMore ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-slate-500">
                Showing {loadedCount} of {result?.total ?? 0}
              </p>
              <button
                type="button"
                onClick={loadMore}
                disabled={isPending}
                className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-3 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/80 disabled:opacity-60"
              >
                {isPending ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="sheen aspect-[3/5] rounded-xl border border-slate-800 bg-slate-900/40"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm ${
        active
          ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
          : "border-slate-800 text-slate-400 hover:border-slate-600"
      }`}
    >
      {label}
    </button>
  );
}
