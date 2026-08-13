import {
  categoryQueryParams,
  type CollectionCategoryFilter,
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

/**
 * Views that aggregate over the whole collection rather than listing copies. They used to force a
 * full-collection load so the browser could group it; the API now rolls them up and pages the
 * GROUPS, so each maps to its own endpoint instead.
 */
const GROUP_ENDPOINTS: Partial<Record<CollectionCategoryFilter, CollectionGroupKind>> = {
  by_set: "sets",
  duplicates: "duplicates",
  teams: "teams",
};

export type CollectionGroupKind = "sets" | "duplicates" | "teams";

/** The grouped endpoint backing a category, or null when the category lists copies. */
export function groupKindFor(
  category: CollectionCategoryFilter,
): CollectionGroupKind | null {
  return GROUP_ENDPOINTS[category] ?? null;
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
 * False means the browser still has to do the ordering, which is only correct over a fully-loaded
 * collection — the two sorts the API can't express. Grouped categories are neither: they have
 * their own endpoints (see `groupKindFor`) and never take this path.
 */
export function usesServerPaging(
  category: CollectionCategoryFilter,
  sort: CollectionSortOption,
): boolean {
  if (groupKindFor(category)) return false;
  return SERVER_SORT[sort] !== null;
}

export interface CollectionRequest {
  search?: string;
  category: CollectionCategoryFilter;
  sort: CollectionSortOption;
  /** Row to start at, or null to fetch the whole collection. */
  offset: number | null;
}

/**
 * Build the query string for /api/collection. `q` always goes to the server, so searching finds
 * cards anywhere in the collection rather than only among the rows already on screen.
 */
export function collectionParams({
  search,
  category,
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

  if (search) params.set("q", search);

  for (const [key, value] of Object.entries(categoryQueryParams(category))) {
    params.set(key, value);
  }

  return params;
}

/**
 * Identity of a request's *server-visible* inputs. Two states with the same key return the same
 * rows, so re-sorting in the browser doesn't trigger a refetch.
 */
export function collectionFetchKey(
  category: CollectionCategoryFilter,
  sort: CollectionSortOption,
  search: string,
): string {
  return usesServerPaging(category, sort)
    ? `paged|${serverSortKey(sort)}|${category}|${search}`
    : `all|${category}|${search}`;
}
