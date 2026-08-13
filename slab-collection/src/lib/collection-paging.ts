import {
  categoryQueryParams,
  type CollectionCategoryFilter,
} from "@/lib/collection-filters";
import type { CollectionSortOption } from "@/lib/collection-sort";

/** Rows per request when the API is doing the paging. */
export const COLLECTION_PAGE_SIZE = 48;

/**
 * Views that aggregate over the entire collection — they group every copy by team, by set, or by
 * card to find duplicates, so a page of results can't answer them. The API has no `set` facet and
 * no duplicates aggregate yet, so these still pull everything.
 */
const GROUPED_CATEGORIES: CollectionCategoryFilter[] = [
  "teams",
  "by_set",
  "duplicates",
];

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

/** True when the API can both filter and order this view, so the browser only needs one page. */
export function usesServerPaging(
  category: CollectionCategoryFilter,
  sort: CollectionSortOption,
): boolean {
  if (GROUPED_CATEGORIES.includes(category)) return false;
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
