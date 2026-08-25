"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import { CardFilterPills, type OwnershipFilter } from "@/components/collection/CardFilterPills";
import { CollectionBrowseTabs } from "@/components/collection/CollectionBrowseTabs";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { TeamLogo } from "@/components/collection/TeamLogo";
import {
  EmptyResults,
  LoadMore,
  ResultsSkeleton,
  SearchToolbar,
  SortSelect,
} from "@/components/search/SearchToolbar";
import { useIsMobile } from "@/lib/use-is-mobile";
import { rowFromCard } from "@/lib/card-row";
import { readUrlParam, writeUrlParams } from "@/lib/url-state";
import type {
  CollectionBrowseMode,
  CollectionFilter,
} from "@/lib/collection-filters";
import { prefetchPlayerImages } from "@/lib/player-image-cache";
import { primarySubjectName } from "@/lib/names";
import type {
  CardSearchQuery,
  CardSearchResult,
  FacetCount,
} from "@/lib/slab/types";
import { fetchJson } from "@/lib/slab/fetch-json";

/**
 * The same search, pointed at the whole catalog instead of your shelf.
 *
 * It shares the collection view's tabs, filter pills and card renderers on purpose — the questions
 * are identical ("McDavid rookies", "everything in this set") and only the answer set differs.
 * Cards / Sets / Teams mean the same thing in both; the catalog just gets its groups from facet
 * counts (the API counts them inside the current filter) instead of the collection's rollup
 * endpoints, and has no Duplicates, since owning two of something is a collection fact.
 *
 * Everything is server-side here: text, filters, grouping and paging all go to the API. The
 * catalog is far too large to load and sort in the browser.
 */
const PAGE_SIZE = 48;
const FACET_LIMIT = 200;

/** The API's sort grammar (`-` prefix = descending). FMV isn't a catalog sort key. */
type CatalogSort = "-release" | "release" | "card_number" | "subject" | "set";

/**
 * Newest is `release`, not `year`: `year` is the SEASON (2025 for a 2025-26 product) and a
 * season's products ship across fourteen months, so ordering by it ties a whole season together
 * and ranks 2025-26 MVP (shelves July 2025) above 2024-25 Ultimate Collection (October 2025).
 * `release` is the API's set-release-date key, which is what a collector means by newest.
 */
const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "-release", label: "Newest release" },
  { value: "release", label: "Oldest release" },
  { value: "set", label: "Set" },
  { value: "card_number", label: "Card #: low to high" },
  { value: "subject", label: "Last name (A–Z)" },
];

const CATALOG_MODES = ["cards", "sets", "teams"] as const satisfies readonly CollectionBrowseMode[];

function filterParams(filter: CollectionFilter): Partial<CardSearchQuery> {
  switch (filter) {
    case "auto":
      return { auto: true };
    case "rookie":
      return { rookie: true };
    case "numbered":
      return { is_numbered: true };
    default:
      return {};
  }
}

export function CatalogSearchView() {
  // Every input that shapes WHICH cards show seeds from the URL and is written back below, so a
  // search survives refresh, Back from a card, and being pasted to someone else.
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [submittedQuery, setSubmittedQuery] = useState(query);
  const [browse, setBrowse] = useState<CollectionBrowseMode>(
    () => readUrlParam(searchParams, "browse", CATALOG_MODES) ?? "cards",
  );
  const [filter, setFilter] = useState<CollectionFilter>(
    () =>
      readUrlParam(searchParams, "filter", ["auto", "rookie", "numbered"] as const) ??
      "all",
  );
  const [ownership, setOwnership] = useState<OwnershipFilter>(
    () => readUrlParam(searchParams, "owned", ["owned", "missing"] as const) ?? "any",
  );
  const [sort, setSort] = useState<CatalogSort>(
    () =>
      readUrlParam(searchParams, "sort", [
        "-release",
        "release",
        "card_number",
        "subject",
        "set",
      ] as const) ?? "-release",
  );
  // Drill-downs from the Sets and Teams tabs. A set is filtered by slug, which the facet doesn't
  // carry, so the name comes along to label the chip and the slug is resolved when it's picked.
  const [pickedSet, setPickedSet] = useState<{ slug: string; name: string } | null>(
    () => {
      const slug = searchParams.get("set");
      return slug ? { slug, name: searchParams.get("setname") ?? slug } : null;
    },
  );
  const [pickedTeam, setPickedTeam] = useState<string | null>(
    () => searchParams.get("team"),
  );

  useEffect(() => {
    writeUrlParams({
      q: submittedQuery || null,
      browse: browse === "cards" ? null : browse,
      filter: filter === "all" ? null : filter,
      owned: ownership === "any" ? null : ownership,
      sort: sort === "-release" ? null : sort,
      set: pickedSet?.slug ?? null,
      setname: pickedSet ? pickedSet.name : null,
      team: pickedTeam,
    });
  }, [submittedQuery, browse, filter, ownership, sort, pickedSet, pickedTeam]);
  const [result, setResult] = useState<CardSearchResult | null>(null);
  const [facets, setFacets] = useState<FacetCount[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isMobile = useIsMobile();

  // Shared by every request this view makes, so the Sets and Teams tabs count exactly the cards
  // the Cards tab would list.
  const baseQuery = useMemo<CardSearchQuery>(
    () => ({
      q: submittedQuery.trim() || undefined,
      ...filterParams(filter),
      ...(ownership === "owned" ? { owned: true } : {}),
      ...(ownership === "missing" ? { owned: false } : {}),
      ...(pickedSet ? { set_slug: [pickedSet.slug] } : {}),
      ...(pickedTeam ? { team: [pickedTeam] } : {}),
    }),
    [filter, ownership, pickedSet, pickedTeam, submittedQuery],
  );

  const fetchKey = `${browse}|${submittedQuery}|${filter}|${ownership}|${sort}|${pickedSet?.slug ?? ""}|${pickedTeam ?? ""}`;

  const runSearch = useCallback(
    async (offset: number): Promise<CardSearchResult | null> => {
      const body: CardSearchQuery = {
        ...baseQuery,
        // Always one row per card SLOT. A player search otherwise returns the same card fifteen
        // times, once per parallel, and buries every other card they have.
        collapse_parallels: true,
        sort,
        limit: PAGE_SIZE,
        offset,
      };

      const result = await fetchJson<CardSearchResult>(
        "/api/cards/search",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        "Catalog search failed",
      );

      if (result.status === "setup") {
        setNeedsSetup(true);
        return null;
      }

      if (result.status === "error") {
        setError(result.message);
        return null;
      }

      setNeedsSetup(false);
      return result.data;
    },
    [baseQuery, sort],
  );

  const runFacets = useCallback(
    async (dimension: "set" | "team"): Promise<CardSearchResult | null> => {
      const result = await fetchJson<CardSearchResult>(
        "/api/cards/search",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...baseQuery,
            facets: dimension,
            // The rows aren't rendered in a grouped view; only the counts are.
            limit: 1,
          }),
        },
        "Catalog search failed",
      );

      if (result.status === "setup") {
        setNeedsSetup(true);
        return null;
      }

      if (result.status === "error") {
        setError(result.message);
        return null;
      }

      setNeedsSetup(false);
      return result.data;
    },
    [baseQuery],
  );

  useEffect(() => {
    startTransition(async () => {
      setError(null);

      if (browse === "sets" || browse === "teams") {
        const data = await runFacets(browse === "sets" ? "set" : "team");
        if (data) {
          const counts =
            browse === "sets" ? data.facets?.set : data.facets?.team;
          setFacets((counts ?? []).slice(0, FACET_LIMIT));
          setResult(data);
        }
      } else {
        const data = await runSearch(0);
        if (data) setResult(data);
      }

      // Marked done even on failure: the error banner explains what happened, and a skeleton left
      // spinning would suggest the request is still coming.
      setLoadedKey(fetchKey);
    });
    // Keyed on fetchKey, not the callbacks: they're rebuilt on every render of the same query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  useEffect(() => {
    if (browse !== "cards" || !result?.items?.length) return;

    const names = [
      ...new Set(
        result.items
          .map((card) => primarySubjectName(card.subjects))
          .filter(Boolean),
      ),
    ];

    void prefetchPlayerImages(names);
  }, [browse, result?.items]);

  const loadMore = useCallback(() => {
    if (!result) return;

    const loaded = result.items?.length ?? 0;
    if (loaded >= result.total) return;

    startTransition(async () => {
      setError(null);
      const data = await runSearch(loaded);
      if (!data) return;

      setResult((previous) => {
        if (!previous) return data;
        return {
          ...previous,
          total: data.total,
          items: [...(previous.items ?? []), ...(data.items ?? [])],
        };
      });
    });
  }, [result, runSearch]);

  const rows = useMemo(
    () => (result?.items ?? []).map((card) => rowFromCard(card)),
    [result?.items],
  );

  const awaitingData = loadedKey !== fetchKey;
  const loadedCount = result?.items?.length ?? 0;
  const hasMore = browse === "cards" && loadedCount < (result?.total ?? 0);

  /** Picking a group drills into it: the Cards tab, narrowed to that set or team. */
  function pickSet(name: string) {
    void resolveSetSlug(name).then((slug) => {
      if (!slug) {
        setError(`Couldn't find the set "${name}" in the catalog.`);
        return;
      }
      setPickedSet({ slug, name });
      setBrowse("cards");
    });
  }

  function pickTeam(team: string) {
    setPickedTeam(team);
    setBrowse("cards");
  }

  /**
   * Dropping a drill chip is the undo of the pick that created it, so it lands back on the
   * grouping tab you drilled from — not on the ungrouped card list.
   *
   * Clearing the chip while staying on Cards undid more than was asked: you'd wanted out of THIS
   * set, and instead got every card in the catalog and a lost place in the group list, with the
   * tab strip the only way back.
   */
  function clearSet() {
    setPickedSet(null);
    setBrowse("sets");
  }

  function clearTeam() {
    setPickedTeam(null);
    setBrowse("teams");
  }

  if (needsSetup) return <SetupPrompt />;

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
        placeholder="Search the catalog — player, set, card number…"
        isPending={isPending}
        sort={
          <SortSelect
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
            disabled={browse !== "cards"}
          />
        }
        tabs={
          <CollectionBrowseTabs
            value={browse}
            onChange={setBrowse}
            modes={CATALOG_MODES}
            disabled={isPending}
          />
        }
        filters={
          <CardFilterPills
            activeFilter={filter}
            onFilterChange={setFilter}
            ownership={ownership}
            onOwnershipChange={setOwnership}
            isPending={isPending}
          />
        }
      />

      {pickedSet || pickedTeam ? (
        <div className="flex flex-wrap items-center gap-2">
          {pickedSet ? (
            <DrillChip label={pickedSet.name} onClear={clearSet} />
          ) : null}
          {pickedTeam ? (
            <DrillChip label={pickedTeam} onClear={clearTeam} />
          ) : null}
        </div>
      ) : null}

      {awaitingData ? (
        <ResultsSkeleton />
      ) : browse === "sets" || browse === "teams" ? (
        <FacetList
          kind={browse}
          facets={facets ?? []}
          onPick={browse === "sets" ? pickSet : pickTeam}
        />
      ) : rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <CardListRow key={row.key} row={row} compact={isMobile} />
          ))}
        </div>
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

/**
 * Name → slug for a set the `set` facet named.
 *
 * Facets count by display name; the filter takes a slug. The set list is small (under a hundred)
 * and already an endpoint, so one lookup resolves it rather than teaching the API a new filter.
 */
async function resolveSetSlug(name: string): Promise<string | null> {
  const result = await fetchJson<{ sets: { name: string; slug: string }[] }>("/api/sets");
  if (result.status !== "ok") return null;
  return result.data.sets.find((set) => set.name === name)?.slug ?? null;
}

function FacetList({
  kind,
  facets,
  onPick,
}: {
  kind: "sets" | "teams";
  facets: FacetCount[];
  onPick: (value: string) => void;
}) {
  if (facets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
        Nothing to group — no cards match this search.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {facets.map((facet) => (
        <button
          key={facet.value}
          type="button"
          onClick={() => onPick(facet.value)}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-3.5 text-left transition hover:border-sky-500/40 hover:bg-slate-900"
        >
          <div className="flex min-w-0 items-center gap-3">
            {kind === "teams" ? <TeamLogo team={facet.value} size="sm" /> : null}
            <p className="truncate font-medium text-white">{facet.value}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="text-sm text-slate-400">
              {facet.count.toLocaleString()} card
              {facet.count === 1 ? "" : "s"}
            </span>
            <span className="text-xs text-sky-400">Show →</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function DrillChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 py-1 pl-3 pr-2 text-sm text-sky-100">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label}`}
        className="rounded-full px-1.5 text-sky-300 transition hover:bg-sky-400/20 hover:text-white"
      >
        ×
      </button>
    </span>
  );
}
