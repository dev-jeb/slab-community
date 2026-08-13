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
 * The grouped endpoint backing a browse mode, or null for the plain card list.
 *
 * Every mode except `cards` is served by an endpoint of the same name, which is why this is a
 * one-line mapping rather than a table: the UI's presentation choice and the API's grouped views
 * are the same set of concepts.
 */
export function groupKindFor(
  browse: CollectionBrowseMode,
): CollectionGroupKind | null {
  return browse === "cards" ? null : browse;
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
 * collection — the two sorts the API can't express. Grouped modes are neither: they have their own
 * endpoints (see `groupKindFor`) and never take this path.
 */
export function usesServerPaging(
  browse: CollectionBrowseMode,
  sort: CollectionSortOption,
): boolean {
  if (groupKindFor(browse)) return false;
  return SERVER_SORT[sort] !== null;
}

export interface CollectionRequest {
  search?: string;
  filter: CollectionFilter;
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

  if (search) params.set("q", search);

  for (const [key, value] of Object.entries(categoryQueryParams(filter))) {
    params.set(key, value);
  }

  return params;
}

/**
 * Identity of a request's *server-visible* inputs. Two states with the same key return the same
 * rows, so re-sorting in the browser doesn't trigger a refetch.
 */
export function collectionFetchKey(
  filter: CollectionFilter,
  sort: CollectionSortOption,
  search: string,
): string {
  return usesServerPaging("cards", sort)
    ? `paged|${serverSortKey(sort)}|${filter}|${search}`
    : `all|${filter}|${search}`;
}

/** Filter params for a grouped request — the same narrowing, applied before the roll-up. */
export function groupFilterParams(filter: CollectionFilter): Record<string, string> {
  return categoryQueryParams(filter);
}
