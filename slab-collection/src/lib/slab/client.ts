import { requireSlabConfig } from "./config";
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
  CollectionResult,
  CollectionSearchQuery,
  CommunityBoard,
  CustomSetCardAdd,
  CustomSetCardOut,
  CustomSetCreate,
  CustomSetDetail,
  CustomSetOut,
  CustomSetSearchQuery,
  CustomSetSearchResult,
  DashboardStats,
  MeOut,
  PortfolioHistory,
  SealedProductOut,
  SetOut,
  SetSearchQuery,
  SetSearchResult,
  SlabError,
} from "./types";

class SlabApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function slabFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

  return response.json() as Promise<T>;
}

async function slabFetchVoid(path: string, init?: RequestInit): Promise<void> {
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
        ...query,
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

  const params = new URLSearchParams({
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    interval: days > 60 ? "weekly" : "daily",
  });

  return slabFetch<PortfolioHistory>(
    `/collectors/${collectorUuid}/portfolio/history?${params.toString()}`,
  );
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
const COLLECTION_PAGE_SIZE = 100;

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
  const { limit: _limit, offset: _offset, ...filters } = query;
  const copies: CardCopyOut[] = [];
  let offset = 0;
  let total = Infinity;
  let summary: CollectionResult["summary"];

  while (offset < total) {
    const page = await searchCollection({
      ...filters,
      limit: COLLECTION_PAGE_SIZE,
      offset,
    });
    total = page.total;
    summary = page.summary ?? summary;
    copies.push(...(page.items ?? []));
    offset += COLLECTION_PAGE_SIZE;
    if (!page.items?.length) break;
  }

  return {
    total,
    limit: copies.length,
    offset: 0,
    items: copies,
    summary,
  };
}

export { SlabApiError };
