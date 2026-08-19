"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import { CardTile } from "@/components/collection/CardTile";
import { CollectionDuplicateGroups } from "@/components/collection/CollectionDuplicateGroups";
import { CardFilterPills } from "@/components/collection/CardFilterPills";
import { CollectionParallelGroups } from "@/components/collection/CollectionParallelGroups";
import { CollectionSetBanners } from "@/components/collection/CollectionSetBanners";
import { CollectionTeamGroups } from "@/components/collection/CollectionTeamGroups";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import {
  EmptyResults,
  LoadMore,
  ResultsSkeleton,
  SearchToolbar,
  ViewToggleGroup,
} from "@/components/search/SearchToolbar";
import { formatApiDetail } from "@/lib/api-errors";
import { useIsMobile } from "@/lib/use-is-mobile";
import { rowFromCopy } from "@/lib/card-row";
import { readUrlParam, writeUrlParams } from "@/lib/url-state";
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
import {
  duplicateGroupsFromCopies,
  filterCopiesBySearch,
  parallelGroupsFromCopies,
  setGroupsFromCopies,
  teamGroupsFromCopies,
} from "@/lib/collection-search";
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

export function CollectionView() {
  // Every input that shapes WHICH cards show seeds from the URL and is written back to it below,
  // so a search survives refresh, Back from a card, and being pasted to someone else.
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [submittedQuery, setSubmittedQuery] = useState(query);
  const [sort, setSort] = useState<CollectionSortOption>(
    () =>
      readUrlParam(searchParams, "sort", [
        "value_desc",
        "confidence_desc",
        "card_number_asc",
        "card_number_desc",
        "alpha_asc",
      ] as const) ?? "value_desc",
  );
  const [view, setView] = useState<ViewMode>("grid");
  // Two independent axes: what you're looking at, and what's been narrowed out of it.
  const [browse, setBrowse] = useState<CollectionBrowseMode>(
    () =>
      readUrlParam(searchParams, "browse", [
        "cards",
        "sets",
        "teams",
        "duplicates",
        "parallels",
      ] as const) ?? "cards",
  );
  // Links into this view (dashboard Top sets) change `browse` in the URL while CollectionView
  // stays mounted. Sync during render so the first paint after the click is already Sets.
  const [urlParamsSnapshot, setUrlParamsSnapshot] = useState(searchParams);
  if (searchParams !== urlParamsSnapshot) {
    setUrlParamsSnapshot(searchParams);
    const nextBrowse =
      readUrlParam(searchParams, "browse", [
        "cards",
        "sets",
        "teams",
        "duplicates",
        "parallels",
      ] as const) ?? "cards";
    if (nextBrowse !== browse) setBrowse(nextBrowse);
  }
  const [filter, setFilter] = useState<CollectionFilter>(
    () =>
      readUrlParam(searchParams, "filter", ["auto", "rookie", "numbered"] as const) ??
      "all",
  );
  const expandSetSlug = (searchParams.get("set") ?? "").trim();
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

  // Three shapes of request, decided by the browse mode, sort, and search (see collection-paging):
  //   grouped   -> its own endpoint, which rolls up and pages the GROUPS
  //   paged     -> one page of copies, filtered and ordered by the API
  //   full load -> everything, for the two sorts the API can't express, for search, and for
  //                parallels (no grouped endpoint — the page rolls copies up itself)
  // Search is matched in the browser across subset/finish/attributes (Slab's `q` does not), so a
  // query forces the full-load path and grouped views are rebuilt from the matching copies.
  const groupKind = groupKindFor(browse);
  const searching = submittedQuery.trim().length > 0;
  const paged = usesServerPaging(browse, sort, submittedQuery);
  const fetchKey =
    groupKind && !searching
      ? `group|${groupKind}|${filter}|${groupSort}`
      : collectionFetchKey(filter, sort, submittedQuery, browse);

  const fetchPage = useCallback(
    async (offset: number | null): Promise<CollectionResult | null> => {
      const params = collectionParams({
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
    [filter, sort],
  );

  const fetchGroups = useCallback(async (): Promise<GroupResult<unknown> | null> => {
    if (!groupKind) return null;

    const response = await fetch(`/api/collection/groups/${groupKind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
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
  }, [filter, groupKind, groupSort]);

  const loadCollection = useCallback(() => {
    startTransition(async () => {
      setError(null);

      if (groupKind && !searching) {
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
  }, [fetchGroups, fetchKey, fetchPage, groupKind, paged, searching]);

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
    writeUrlParams({
      q: submittedQuery || null,
      sort: sort === "value_desc" ? null : sort,
      browse: browse === "cards" ? null : browse,
      filter: filter === "all" ? null : filter,
      set: browse === "sets" ? expandSetSlug || null : null,
      setname: null,
    });
  }, [submittedQuery, sort, browse, filter, expandSetSlug]);

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
    const matched = filterCopiesBySearch(loaded, submittedQuery);
    // A paged response is already filtered and ordered by the API. Re-sorting it here would only
    // reorder the rows that happen to be loaded, which is worse than leaving it alone.
    if (paged) return matched;
    return sortCollectionCopies(matched, sort);
  }, [result?.items, sort, paged, submittedQuery]);

  const visibleSetGroups = useMemo(() => {
    if (groupKind !== "sets") return [];
    if (searching) return setGroupsFromCopies(items, groupSort);
    return (groups?.items ?? []) as SetGroupOut[];
  }, [groupKind, searching, items, groupSort, groups?.items]);

  const visibleTeamGroups = useMemo(() => {
    if (groupKind !== "teams") return [];
    if (searching) return teamGroupsFromCopies(items, groupSort);
    return (groups?.items ?? []) as TeamGroupOut[];
  }, [groupKind, searching, items, groupSort, groups?.items]);

  const visibleDuplicateGroups = useMemo(() => {
    if (groupKind !== "duplicates") return [];
    if (searching) return duplicateGroupsFromCopies(items, groupSort);
    return (groups?.items ?? []) as DuplicateGroupOut[];
  }, [groupKind, searching, items, groupSort, groups?.items]);

  const visibleParallelGroups = useMemo(() => {
    if (browse !== "parallels") return [];
    return parallelGroupsFromCopies(items, groupSort);
  }, [browse, items, groupSort]);

  // True from the moment the inputs change until that request's data is on screen — including
  // the first load, when there's nothing to be stale.
  const awaitingData = loadedKey !== fetchKey;
  const keepStaleGroups =
    Boolean(groupKind) &&
    !searching &&
    groups != null &&
    (loadedKey?.startsWith(`group|${groupKind}|`) ?? false);

  const loadedCount = result?.items?.length ?? 0;
  const hasMore = paged && loadedCount < (result?.total ?? 0);

  // Whole-collection counts, so they're right no matter how little of it is loaded. These used to
  // be derived from the rows on hand, which meant they were either absent while paging or, worse,
  // computed off a single page.
  const uniqueSetCount = stats?.sets;
  const duplicateCount = stats?.duplicates;
  const parallelCount = stats?.parallel_count;

  const ownedTotals = useMemo(
    () => ownedCountByCardUuid(result?.items ?? []),
    [result?.items],
  );

  const highlightCardNumber =
    sort === "card_number_asc" || sort === "card_number_desc";

  // Grid/list is a card-layout choice; the grouped views render their own shapes.
  const showViewToggle = browse === "cards";

  // Each handler only moves state; the effect above decides whether that state change actually
  // needs a new request. Previously these fired a fetch AND changed state, which refetched twice.
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
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      <SearchToolbar
        query={query}
        onQueryChange={setQuery}
        onSubmit={() => setSubmittedQuery(query.trim())}
        placeholder="Search your cards — player, set, subset, parallel…"
        isPending={isPending}
        sort={
          <CollectionSortSelect
            browse={browse}
            cardSort={sort}
            onCardSortChange={handleSortChange}
            groupSort={groupSort}
            onGroupSortChange={setGroupSort}
          />
        }
        viewToggle={
          <ViewToggleGroup
            view={view}
            onChange={setView}
            hidden={!showViewToggle}
          />
        }
        tabs={
          <CollectionBrowseTabs
            value={browse}
            onChange={handleBrowseChange}
            counts={{
              cards: stats?.total_cards,
              sets: uniqueSetCount,
              teams: stats?.teams,
              duplicates: duplicateCount,
              parallels: parallelCount,
            }}
            disabled={isPending}
          />
        }
        filters={
          <CardFilterPills
            counts={{
              auto: stats?.autos,
              rookie: stats?.rookies,
              numbered: stats?.numbered,
            }}
            activeFilter={filter}
            onFilterChange={handleFilterChange}
            isPending={isPending}
          />
        }
      />

      {(groupKind || browse === "parallels") && awaitingData && !keepStaleGroups ? (
        <GroupSkeleton />
      ) : groupKind === "teams" ? (
        <CollectionTeamGroups groups={visibleTeamGroups} sort={groupSort} />
      ) : groupKind === "sets" ? (
        <CollectionSetBanners
          groups={visibleSetGroups}
          expandSlug={expandSetSlug}
          sort={groupSort}
        />
      ) : groupKind === "duplicates" ? (
        <CollectionDuplicateGroups groups={visibleDuplicateGroups} />
      ) : browse === "parallels" ? (
        <CollectionParallelGroups groups={visibleParallelGroups} />
      ) : awaitingData ? (
        <ResultsSkeleton />
      ) : items.length > 0 ? (
        view === "grid" && !isMobile ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((copy) => (
              <CardTile
                key={copy.uuid}
                row={rowFromCopy(copy, ownedTotals.get(copy.card_uuid))}
                highlightChecklist={highlightCardNumber}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((copy) => (
              <CardListRow
                key={copy.uuid}
                row={rowFromCopy(copy, ownedTotals.get(copy.card_uuid))}
                highlightChecklist={highlightCardNumber}
                compact={isMobile}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyResults>No cards match this search.</EmptyResults>
      )}

      {hasMore ? (
        <LoadMore
          loaded={loadedCount}
          total={result?.total ?? 0}
          isPending={isPending}
          onLoadMore={loadMore}
        />
      ) : null}
    </div>
  );
}
