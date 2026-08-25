import { requireSlabConfig } from "./config";
import { SlabApiError } from "./errors";
import { formatApiDetail } from "@/lib/api-errors";
import type {
  CardComps,
  CardMarket,
  CardCopyOut,
  CardCopyUpdate,
  CardOut,
  CardPriceHistory,
  CardSearchQuery,
  CardSearchResult,
  CollectionGradingDesk,
  GradingDesk,
  CollectionResult,
  CollectionSearchQuery,
  CommunityBoard,
  GroupResult,
  GroupSort,
  CustomSetCardAdd,
  CustomSetCardOut,
  CustomSetCreate,
  CustomSetDetail,
  CustomSetOut,
  CustomSetSearchQuery,
  CustomSetSearchResult,
  DashboardStats,
  LifecycleCurve,
  LifecycleUniverse,
  MeOut,
  PortfolioHistory,
  SealedMarket,
  SealedPriceHistory,
  SealedProductOut,
  SetTopCards,
  SetOut,
  SetSearchQuery,
  SetSearchResult,
} from "./types";

/**
 * One authenticated call to Slab: key header, no caching, non-2xx raised as {@link SlabApiError}.
 * Every function below goes through here.
 *
 * The two wrappers under it are the only thing that ever differed — whether the caller wants a
 * parsed body or just the success. They used to be two full copies of this function, identical
 * apart from the last line.
 */
async function slabRequest(path: string, init?: RequestInit): Promise<Response> {
  const { apiKey, apiUrl } = requireSlabConfig();

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: unknown };
      detail = formatApiDetail(body.detail, detail);
    } catch {
      // ignore parse errors
    }
    throw new SlabApiError(detail, response.status);
  }

  return response;
}

async function slabFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await slabRequest(path, init);
  return response.json() as Promise<T>;
}

async function slabFetchVoid(path: string, init?: RequestInit): Promise<void> {
  await slabRequest(path, init);
}

let cachedCollectorUuid: string | null = null;

export async function getCollectorUuid(): Promise<string> {
  const { collectorUuid } = requireSlabConfig();
  if (collectorUuid) return collectorUuid;

  if (cachedCollectorUuid) return cachedCollectorUuid;

  const account = await getAccount();
  const uuid =
    account.default_collector_uuid ?? account.collectors[0]?.uuid ?? null;

  if (!uuid) {
    throw new Error(
      "No collector found for this API key. Create one with `slab collector create` or set SLAB_COLLECTOR_UUID.",
    );
  }

  cachedCollectorUuid = uuid;
  return uuid;
}

export async function getAccount(): Promise<MeOut> {
  return slabFetch<MeOut>("/account");
}

/** Slab's collection search wants `set_slug` as a list; a query-string value arrives as a string. */
function normalizeCollectionQuery(
  query: CollectionSearchQuery,
): CollectionSearchQuery {
  const slug = query.set_slug;
  if (typeof slug === "string") {
    const trimmed = slug.trim();
    return { ...query, set_slug: trimmed ? [trimmed] : undefined };
  }
  return query;
}

export async function searchCollection(
  query: CollectionSearchQuery = {},
): Promise<CollectionResult> {
  const collectorUuid = await getCollectorUuid();

  return slabFetch<CollectionResult>(
    `/collectors/${collectorUuid}/collection/search`,
    {
      method: "POST",
      body: JSON.stringify({
        limit: 48,
        offset: 0,
        ...normalizeCollectionQuery(query),
      }),
    },
  );
}

export type CollectionGroupKind = "sets" | "duplicates" | "teams";

export interface CollectionGroupQuery extends CollectionSearchQuery {
  group_sort?: GroupSort;
  include_copies?: boolean;
}

/** Grouped views page over GROUPS, so this is a count of sets/cards/teams, not copies. */
const GROUP_PAGE_SIZE = 100;

/**
 * The collection rolled up by set, by card (duplicates), or by team.
 *
 * These replace grouping in the browser, which needed every copy loaded first. The API pages the
 * GROUPS, so a set's copies never straddle a page boundary. `include_copies: false` returns
 * headers only — use it when the UI reveals a group's cards on expand.
 */
export async function listCollectionGroups<T>(
  kind: CollectionGroupKind,
  query: CollectionGroupQuery = {},
): Promise<GroupResult<T>> {
  const collectorUuid = await getCollectorUuid();

  return slabFetch<GroupResult<T>>(
    `/collectors/${collectorUuid}/collection/${kind}`,
    {
      method: "POST",
      body: JSON.stringify({
        limit: GROUP_PAGE_SIZE,
        offset: 0,
        ...normalizeCollectionQuery(query),
      }),
    },
  );
}

export async function updateCopy(
  copyUuid: string,
  body: CardCopyUpdate,
): Promise<CardCopyOut> {
  const collectorUuid = await getCollectorUuid();

  return slabFetch<CardCopyOut>(
    `/collectors/${collectorUuid}/copies/${copyUuid}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function searchSets(
  query: SetSearchQuery = {},
): Promise<SetSearchResult> {
  return slabFetch<SetSearchResult>("/sets/search", {
    method: "POST",
    body: JSON.stringify({
      limit: 20,
      offset: 0,
      ...query,
    }),
  });
}

export async function getSetSealed(setUuid: string): Promise<SealedProductOut[]> {
  return slabFetch<SealedProductOut[]>(`/sets/${setUuid}/sealed`);
}

/**
 * A sealed SKU's price series — the same shape and the same snapshot rule as a card's, keyed by
 * product instead of by (card, finish, grade). Sealed has no grade or finish axis: v1 prices
 * factory-sealed only.
 */
export async function getSealedPriceHistory(
  productUuid: string,
  query: { interval?: string; start?: string; end?: string } = {},
): Promise<SealedPriceHistory> {
  const params = new URLSearchParams();
  params.set("interval", query.interval ?? "daily");
  if (query.start) params.set("start", query.start);
  if (query.end) params.set("end", query.end);

  return slabFetch<SealedPriceHistory>(
    `/sealed/${productUuid}/price-history?${params.toString()}`,
  );
}

/**
 * A sealed SKU's market — its snapshot points plus the recent sales behind them.
 *
 * The comps are the receipts: a sealed price is a trimmed median of these, and being able to read
 * the individual sales is what separates a number you can check from one you have to trust.
 */
export async function getSealedMarket(
  productUuid: string,
  compsLimit = 50,
): Promise<SealedMarket> {
  return slabFetch<SealedMarket>(
    `/sealed/${productUuid}/market?comps_limit=${compsLimit}`,
  );
}

/** The set's most expensive printings by headline FMV — RAW preferred, else best-sampled grade. */
export async function getSetTopCards(
  setUuid: string,
  limit = 15,
): Promise<SetTopCards> {
  return slabFetch<SetTopCards>(`/sets/${setUuid}/top-cards?limit=${limit}`);
}

export async function searchCards(
  query: CardSearchQuery = {},
): Promise<CardSearchResult> {
  return slabFetch<CardSearchResult>("/cards/search", {
    method: "POST",
    body: JSON.stringify({
      limit: 20,
      offset: 0,
      include_market: true,
      ...query,
    }),
  });
}

const CARD_PAGE_SIZE = 200;

export async function fetchAllMatchingCards(
  query: CardSearchQuery = {},
): Promise<{ cards: CardOut[]; total: number }> {
  const cards: CardOut[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await searchCards({
      ...query,
      limit: CARD_PAGE_SIZE,
      offset,
      include_market: false,
    });
    total = page.total;
    cards.push(...(page.items ?? []));
    offset += CARD_PAGE_SIZE;
    if (!page.items?.length) break;
  }

  return { cards, total };
}

export async function getCardMarket(cardUuid: string): Promise<CardMarket> {
  return slabFetch<CardMarket>(`/cards/${cardUuid}/market`);
}

export interface CardCompsQuery {
  grade_key?: string;
  limit?: number;
}

export async function getCardComps(
  cardUuid: string,
  query: CardCompsQuery = {},
): Promise<CardComps> {
  const params = new URLSearchParams();
  if (query.grade_key) params.set("grade_key", query.grade_key);
  if (query.limit) params.set("limit", String(query.limit));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return slabFetch<CardComps>(`/cards/${cardUuid}/comps${suffix}`);
}

export interface GradingDeskQuery {
  /** Your grading fee per card, USD — the API's default is an approximate walk-in rate. */
  fee?: number;
  company?: string;
}

function gradingParams(query: GradingDeskQuery): string {
  const params = new URLSearchParams();
  if (query.fee !== undefined) params.set("fee", String(query.fee));
  if (query.company) params.set("company", query.company);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function getGradingDesk(
  cardUuid: string,
  query: GradingDeskQuery = {},
): Promise<GradingDesk> {
  return slabFetch<GradingDesk>(
    `/cards/${cardUuid}/grading-desk${gradingParams(query)}`,
  );
}

export async function getCollectionGradingDesk(
  query: GradingDeskQuery & { limit?: number } = {},
): Promise<CollectionGradingDesk> {
  const collectorUuid = await getCollectorUuid();
  const params = new URLSearchParams();
  if (query.fee !== undefined) params.set("fee", String(query.fee));
  if (query.company) params.set("company", query.company);
  params.set("limit", String(query.limit ?? 100));
  return slabFetch<CollectionGradingDesk>(
    `/collectors/${collectorUuid}/collection/grading-desk?${params.toString()}`,
  );
}

export async function getCardParallels(cardUuid: string): Promise<CardOut[]> {
  return slabFetch<CardOut[]>(`/cards/${cardUuid}/parallels`);
}

export interface CardPriceHistoryQuery {
  grade_key?: string;
  finish?: string | null;
  start?: string;
  end?: string;
  interval?: string;
}

export async function getCardPriceHistory(
  cardUuid: string,
  query: CardPriceHistoryQuery = {},
): Promise<CardPriceHistory> {
  const params = new URLSearchParams();
  params.set("grade_key", query.grade_key ?? "RAW");
  params.set("interval", query.interval ?? "daily");
  if (query.finish) params.set("finish", query.finish);
  if (query.start) params.set("start", query.start);
  if (query.end) params.set("end", query.end);

  return slabFetch<CardPriceHistory>(
    `/cards/${cardUuid}/price-history?${params.toString()}`,
  );
}

export async function getDashboard(): Promise<DashboardStats> {
  const collectorUuid = await getCollectorUuid();
  return slabFetch<DashboardStats>(`/collectors/${collectorUuid}/dashboard`);
}

export async function getPortfolioHistory(
  days = 90,
): Promise<PortfolioHistory> {
  const collectorUuid = await getCollectorUuid();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  // Daily is the API's native grain. Weekly was used for windows over 60 days, which left a
  // 90-day chart with about 13 points. Ninety daily snapshots is still a small payload.
  const params = new URLSearchParams({
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    interval: "daily",
  });

  return slabFetch<PortfolioHistory>(
    `/collectors/${collectorUuid}/portfolio/history?${params.toString()}`,
  );
}

/**
 * The most-subscribed public chase sets.
 *
 * Use this, not `getCommunityBoard`, when popular sets are all you need. The board is one payload
 * carrying catalog stats, a ticker, several leaderboards, and a glossary, and it embeds this list
 * as one field — measured at 15.6s and 32KB against 0.24s and 398 bytes for the list on its own.
 */
export async function getPopularCustomSets(limit = 20): Promise<CustomSetOut[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return slabFetch<CustomSetOut[]>(`/custom-sets/popular?${params.toString()}`);
}

export async function getCommunityBoard(limit = 20): Promise<CommunityBoard> {
  const params = new URLSearchParams({ limit: String(limit) });
  return slabFetch<CommunityBoard>(`/community?${params.toString()}`);
}

export async function searchCustomSets(
  query: CustomSetSearchQuery = {},
): Promise<CustomSetSearchResult> {
  const collectorUuid = await getCollectorUuid();
  return slabFetch<CustomSetSearchResult>("/custom-sets/search", {
    method: "POST",
    body: JSON.stringify({
      collector_uuid: collectorUuid,
      sort: "-subscribers",
      limit: 50,
      ...query,
    }),
  });
}

export async function subscribeToCustomSet(setUuid: string): Promise<void> {
  const collectorUuid = await getCollectorUuid();
  await slabFetchVoid(
    `/collectors/${collectorUuid}/custom-sets/${setUuid}/subscribe`,
    { method: "POST" },
  );
}

export async function unsubscribeFromCustomSet(setUuid: string): Promise<void> {
  const collectorUuid = await getCollectorUuid();
  await slabFetchVoid(
    `/collectors/${collectorUuid}/custom-sets/${setUuid}/subscribe`,
    { method: "DELETE" },
  );
}

export async function listCollectorCustomSets(): Promise<CustomSetOut[]> {
  const collectorUuid = await getCollectorUuid();
  return slabFetch<CustomSetOut[]>(
    `/collectors/${collectorUuid}/custom-sets`,
  );
}

export async function getCustomSet(setUuid: string): Promise<CustomSetDetail> {
  const collectorUuid = await getCollectorUuid();
  const params = new URLSearchParams({ collector_uuid: collectorUuid });
  return slabFetch<CustomSetDetail>(
    `/custom-sets/${setUuid}?${params.toString()}`,
  );
}

export async function createCustomSet(
  body: CustomSetCreate,
): Promise<CustomSetOut> {
  const collectorUuid = await getCollectorUuid();
  return slabFetch<CustomSetOut>(
    `/collectors/${collectorUuid}/custom-sets`,
    {
      method: "POST",
      body: JSON.stringify({
        visibility: body.visibility ?? "private",
        ...body,
      }),
    },
  );
}

export async function addCustomSetCard(
  setUuid: string,
  body: CustomSetCardAdd,
): Promise<CustomSetCardOut> {
  const collectorUuid = await getCollectorUuid();
  return slabFetch<CustomSetCardOut>(
    `/collectors/${collectorUuid}/custom-sets/${setUuid}/cards`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

const SETS_PAGE_SIZE = 200;
// 200 is the API's cap (slab_schemas CollectionSearchQuery.limit: ge=1, le=200), so anything
// smaller just buys extra round trips.
const COLLECTION_PAGE_SIZE = 200;
// How many page requests to keep in the air at once. Enough to hide latency, low enough that a
// large collection doesn't fire 50 simultaneous requests at the API.
const PAGE_CONCURRENCY = 6;

/** Run `task` over every item, keeping at most `limit` in flight. Results keep input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function fetchAllSets(): Promise<SetOut[]> {
  const sets: SetOut[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await searchSets({ limit: SETS_PAGE_SIZE, offset });
    total = page.total;
    sets.push(...(page.items ?? []));
    offset += SETS_PAGE_SIZE;
    if (!page.items?.length) break;
  }

  return sets;
}

export async function fetchAllCollection(): Promise<CardCopyOut[]> {
  const result = await fetchCollection({});
  return result.items ?? [];
}

export async function fetchCollection(
  query: CollectionSearchQuery = {},
): Promise<CollectionResult> {
  // Paging is this function's job, so a caller's limit/offset would fight it — dropped, not honored.
  const filters: CollectionSearchQuery = { ...query };
  delete filters.limit;
  delete filters.offset;

  // The first page tells us the total, which is what lets the rest go out together. Paging
  // serially meant every page waited on the one before it, so a large collection cost the sum of
  // all round trips instead of roughly one.
  const first = await searchCollection({
    ...filters,
    limit: COLLECTION_PAGE_SIZE,
    offset: 0,
  });

  const total = first.total ?? 0;
  const copies: CardCopyOut[] = [...(first.items ?? [])];

  if (copies.length && copies.length < total) {
    const offsets: number[] = [];
    for (let offset = COLLECTION_PAGE_SIZE; offset < total; offset += COLLECTION_PAGE_SIZE) {
      offsets.push(offset);
    }

    const pages = await mapWithConcurrency(offsets, PAGE_CONCURRENCY, (offset) =>
      searchCollection({ ...filters, limit: COLLECTION_PAGE_SIZE, offset }),
    );

    for (const page of pages) {
      copies.push(...(page.items ?? []));
    }
  }

  return {
    total,
    limit: copies.length,
    offset: 0,
    items: copies,
    summary: first.summary,
  };
}

/**
 * The lifecycle benchmark — the current build, frozen until the next one.
 *
 * Public on the API (no key needed); this goes through the same authenticated fetch as everything
 * else because there's no reason for a second code path. 404 is a real answer here, not a bug: it
 * means no build has run yet, and the caller is expected to say so rather than draw an empty curve.
 */
export async function getLifecycleCurve(
  universe: LifecycleUniverse = "raw_cards",
): Promise<LifecycleCurve> {
  return slabFetch<LifecycleCurve>(`/market/lifecycle?universe=${universe}`);
}
