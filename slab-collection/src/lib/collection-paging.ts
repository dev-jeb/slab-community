import {
  categoryQueryParams,
  type CollectionBrowseMode,
  type CollectionFilter,
} from "@/lib/collection-filters";
import type { CollectionSortOption } from "@/lib/collection-sort";
import type { GroupSort } from "@/lib/slab/types";

/**
 * Teams can also be ordered by distinct players, which no other grouped view has and the shared
 * `group_sort` therefore doesn't carry. It's resolved in the teams view over the groups the
 * server returned — see CollectionTeamGroups for when that stops being exact.
 */
export const TEAM_PLAYERS_SORT = "players_desc";

export type GroupSortOption = GroupSort | typeof TEAM_PLAYERS_SORT;

/** Rows per request when the API is doing the paging. */
export const COLLECTION_PAGE_SIZE = 48;

export type CollectionGroupKind = "sets" | "duplicates" | "teams";

/**
 * The grouped endpoint backing a browse mode, or null when there isn't one.
 *
 * Sets, teams, and duplicates each have a `/collection/{kind}` roll-up. Cards is a flat list.
 * Parallels is grouped in the UI but has no endpoint — the page loads copies and rolls them up.
 */
export function groupKindFor(
  browse: CollectionBrowseMode,
): CollectionGroupKind | null {
  if (browse === "sets" || browse === "teams" || browse === "duplicates") {
    return browse;
  }
  return null;
}

/**
 * Sort options mapped to the API's sort grammar, or null where the API has no equivalent:
 * `alpha_asc` would need a `subject` key in the collection sort map (the catalog has one, the
 * collection doesn't), and nothing in the API orders by comp confidence. A null here means the
 * sort is done in the browser, which is only correct over a fully-loaded collection.
 */
const SERVER_SORT: Record<CollectionSortOption, string | null> = {
  value_desc: "-fmv",
  card_number_asc: "card_number",
  card_number_desc: "-card_number",
  alpha_asc: null,
  confidence_desc: null,
};

export function serverSortKey(sort: CollectionSortOption): string | null {
  return SERVER_SORT[sort];
}

/**
 * True when the API can both filter and order this view, so the browser only needs one page.
 *
 * False means the browser still has to do the work, which is only correct over a fully-loaded
 * collection — the two sorts the API can't express, free-text search (Slab's `q` only matches
 * player / set / card number, not subset, finish, or attributes), and parallels (no grouped
 * endpoint). Other grouped modes have their own endpoints (see `groupKindFor`) and never take
 * this path.
 */
export function usesServerPaging(
  browse: CollectionBrowseMode,
  sort: CollectionSortOption,
  search = "",
): boolean {
  if (search.trim()) return false;
  if (browse === "parallels") return false;
  if (groupKindFor(browse)) return false;
  return SERVER_SORT[sort] !== null;
}

export interface CollectionRequest {
  filter: CollectionFilter;
  sort: CollectionSortOption;
  /** Row to start at, or null to fetch the whole collection. */
  offset: number | null;
}

/**
 * Build the query string for /api/collection.
 *
 * Free-text search is applied in the browser (see `filterCopiesBySearch`) so this does not send
 * `q`. Slab's `q` only matches player, set, and card number, which would hide Young Guns / Outburst
 * matches that live on subset and finish.
 */
export function collectionParams({
  filter,
  sort,
  offset,
}: CollectionRequest): URLSearchParams {
  const params = new URLSearchParams();

  if (offset === null) {
    params.set("all", "true");
  } else {
    params.set("limit", String(COLLECTION_PAGE_SIZE));
    params.set("offset", String(offset));
    const serverSort = serverSortKey(sort);
    if (serverSort) params.set("sort", serverSort);
  }

  for (const [key, value] of Object.entries(categoryQueryParams(filter))) {
    params.set(key, value);
  }

  return params;
}

/**
 * Identity of a request's *server-visible* inputs. Two states with the same key return the same
 * rows, so re-sorting or re-searching in the browser doesn't trigger a refetch.
 */
export function collectionFetchKey(
  filter: CollectionFilter,
  sort: CollectionSortOption,
  search = "",
  browse: CollectionBrowseMode = "cards",
): string {
  return usesServerPaging(browse, sort, search)
    ? `paged|${serverSortKey(sort)}|${filter}`
    : `all|${filter}`;
}

/** Filter params for a grouped request — the same narrowing, applied before the roll-up. */
export function groupFilterParams(filter: CollectionFilter): Record<string, string> {
  return categoryQueryParams(filter);
}
