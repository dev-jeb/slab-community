import { fetchAllCollection, fetchAllSets, getCardComps } from "@/lib/slab/client";
import type { CompOut, SetOut, TickerItem } from "@/lib/slab/types";

const COMP_LIMIT = 3;
const COMP_CONCURRENCY = 12;
/** Cards per /api/news/comps request — small enough to finish well under Slab's ~30s cutoff. */
export const NEWS_COMP_BATCH_MAX = 24;

export interface OwnedCardNews {
  cardUuid: string;
  cardNumber: string;
  subjects: string[];
  setName?: string | null;
  subset?: string | null;
  finish?: string | null;
  ownedCount: number;
  market: {
    fmv: string | null;
    sampleSize: number | null;
    lowConfidence: boolean | null;
  } | null;
  comps: {
    total: number;
    latest: CompOut | null;
  };
}

export interface NewsPayload {
  sets: SetOut[];
  ticker: TickerItem[];
  ownedCards: OwnedCardNews[];
}

function latestComp(comps: CompOut[]): CompOut | null {
  if (!comps.length) return null;

  return [...comps].sort((a, b) => {
    const dateA = a.sold_date ? Date.parse(a.sold_date) : 0;
    const dateB = b.sold_date ? Date.parse(b.sold_date) : 0;
    return dateB - dateA;
  })[0];
}

const EMPTY_COMPS: OwnedCardNews["comps"] = { total: 0, latest: null };

async function fetchCompsWithConcurrency(
  cardUuids: string[],
): Promise<Map<string, OwnedCardNews["comps"]>> {
  const results = new Map<string, OwnedCardNews["comps"]>();
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(COMP_CONCURRENCY, cardUuids.length) },
    async () => {
      while (cursor < cardUuids.length) {
        const index = cursor++;
        const cardUuid = cardUuids[index];
        try {
          const comps = await getCardComps(cardUuid, { limit: COMP_LIMIT });
          results.set(cardUuid, {
            total: comps.total,
            latest: latestComp(comps.comps),
          });
        } catch {
          results.set(cardUuid, EMPTY_COMPS);
        }
      }
    },
  );

  await Promise.all(workers);
  return results;
}

export async function fetchOwnedCardComps(
  cardUuids: string[],
): Promise<Record<string, OwnedCardNews["comps"]>> {
  const unique = [...new Set(cardUuids.filter(Boolean))].slice(
    0,
    NEWS_COMP_BATCH_MAX,
  );
  const map = await fetchCompsWithConcurrency(unique);
  return Object.fromEntries(map);
}

/**
 * Catalog sets + one row per unique owned card. Comps are loaded in a follow-up
 * (`/api/news/comps`) so this request cannot sit on hundreds of Slab round trips.
 */
export async function buildNewsPayload(): Promise<NewsPayload> {
  const [sets, copies] = await Promise.all([
    fetchAllSets(),
    fetchAllCollection(),
  ]);

  const cardMap = new Map<string, OwnedCardNews>();

  for (const copy of copies) {
    if (!copy.card_uuid) continue;

    const qty = Math.max(copy.quantity, 1);
    const existing = cardMap.get(copy.card_uuid);
    if (existing) {
      existing.ownedCount += qty;
      continue;
    }

    const card = copy.card;
    cardMap.set(copy.card_uuid, {
      cardUuid: copy.card_uuid,
      cardNumber: card?.card_number ?? copy.card_uuid,
      subjects: card?.subjects.map((subject) => subject.name) ?? [],
      setName: card?.set_name,
      subset: card?.subset,
      finish: card?.finish,
      ownedCount: qty,
      market: copy.market
        ? {
            fmv: copy.market.fair_market_value ?? null,
            sampleSize: copy.market.sample_size ?? null,
            lowConfidence: copy.market.low_confidence ?? null,
          }
        : null,
      comps: EMPTY_COMPS,
    });
  }

  return {
    sets,
    ticker: [],
    ownedCards: [...cardMap.values()],
  };
}
