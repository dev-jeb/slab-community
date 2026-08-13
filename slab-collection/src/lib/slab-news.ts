import {
  fetchAllCollection,
  fetchAllSets,
  getCardComps,
  getCommunityBoard,
} from "@/lib/slab/client";
import type { CompOut, SetOut, TickerItem } from "@/lib/slab/types";

const COMP_LIMIT = 3;
const COMP_BATCH_SIZE = 8;

export interface OwnedCardNews {
  cardUuid: string;
  cardNumber: string;
  subjects: string[];
  setName?: string | null;
  subset?: string | null;
  finish?: string | null;
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

async function fetchCompsInBatches(
  cardUuids: string[],
): Promise<Map<string, OwnedCardNews["comps"]>> {
  const results = new Map<string, OwnedCardNews["comps"]>();

  for (let index = 0; index < cardUuids.length; index += COMP_BATCH_SIZE) {
    const batch = cardUuids.slice(index, index + COMP_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (cardUuid) => {
        const comps = await getCardComps(cardUuid, { limit: COMP_LIMIT });
        return [
          cardUuid,
          {
            total: comps.total,
            latest: latestComp(comps.comps),
          },
        ] as const;
      }),
    );

    for (const [cardUuid, compSummary] of batchResults) {
      results.set(cardUuid, compSummary);
    }
  }

  return results;
}

export async function buildNewsPayload(): Promise<NewsPayload> {
  const [sets, community, copies] = await Promise.all([
    fetchAllSets(),
    getCommunityBoard(20),
    fetchAllCollection(),
  ]);

  const cardMap = new Map<
    string,
    {
      cardNumber: string;
      subjects: string[];
      setName?: string | null;
      subset?: string | null;
      finish?: string | null;
      market: OwnedCardNews["market"];
    }
  >();

  for (const copy of copies) {
    if (!copy.card_uuid || cardMap.has(copy.card_uuid)) continue;

    const card = copy.card;
    cardMap.set(copy.card_uuid, {
      cardNumber: card?.card_number ?? copy.card_uuid,
      subjects: card?.subjects.map((subject) => subject.name) ?? [],
      setName: card?.set_name,
      subset: card?.subset,
      finish: card?.finish,
      market: copy.market
        ? {
            fmv: copy.market.fair_market_value ?? null,
            sampleSize: copy.market.sample_size ?? null,
            lowConfidence: copy.market.low_confidence ?? null,
          }
        : null,
    });
  }

  const cardUuids = [...cardMap.keys()];
  const compSummaries = await fetchCompsInBatches(cardUuids);

  const ownedCards: OwnedCardNews[] = cardUuids.map((cardUuid) => {
    const card = cardMap.get(cardUuid)!;
    return {
      cardUuid,
      cardNumber: card.cardNumber,
      subjects: card.subjects,
      setName: card.setName,
      subset: card.subset,
      finish: card.finish,
      market: card.market,
      comps: compSummaries.get(cardUuid) ?? { total: 0, latest: null },
    };
  });

  return {
    sets,
    ticker: community.ticker ?? [],
    ownedCards,
  };
}
