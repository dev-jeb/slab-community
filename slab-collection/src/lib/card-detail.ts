import {
  fetchCollection,
  getCardComps,
  getCardMarket,
  getCardParallels,
  getCardPriceHistory,
} from "@/lib/slab/client";
import type {
  CardComps,
  CardCopyOut,
  CardMarket,
  CardOut,
  CardPriceHistory,
  CompOut,
  PricePointOut,
} from "@/lib/slab/types";

const COMP_LIMIT = 50;
const HISTORY_DAYS = 90;

export interface RawPriceSummary {
  sampleSize: number;
  compTotal: number;
  median: string | null;
  low: string | null;
  high: string | null;
  average: string | null;
  compMin: string | null;
  compMax: string | null;
  lowConfidence: boolean;
  recentComps: CompOut[];
}

export interface GradedPriceSummary {
  gradeKey: string;
  finish?: string | null;
  sampleSize: number;
  median: string | null;
  low: string | null;
  high: string | null;
  lowConfidence: boolean;
  uplift: string | null;
}

export interface ParallelSummary {
  card: CardOut;
  headlineFmv: string | null;
  ownedCount: number;
}

export interface CardDetailResult {
  cardUuid: string;
  market: CardMarket;
  raw: RawPriceSummary | null;
  graded: GradedPriceSummary[];
  comps: CardComps;
  priceHistory: CardPriceHistory;
  parallels: ParallelSummary[];
  ownedCopies: CardCopyOut[];
  gradeKeys: string[];
}

function toDecimal(value: number): string {
  return value.toFixed(2);
}

function compPrices(comps: CompOut[]): number[] {
  return comps
    .map((comp) => (comp.sale_price ? Number(comp.sale_price) : NaN))
    .filter((price) => !Number.isNaN(price) && price > 0);
}

function summarizeComps(comps: CompOut[], total: number) {
  const prices = compPrices(comps);

  return {
    compTotal: total,
    average: prices.length
      ? toDecimal(prices.reduce((sum, price) => sum + price, 0) / prices.length)
      : null,
    compMin: prices.length ? toDecimal(Math.min(...prices)) : null,
    compMax: prices.length ? toDecimal(Math.max(...prices)) : null,
    recentComps: comps.slice(0, 15),
  };
}

function pickRawPoint(points: PricePointOut[]): PricePointOut | null {
  const raw = points.find((point) => point.grade_key === "RAW");
  if (raw) return raw;
  return points.length ? points[0] : null;
}

function computeUplift(
  rawMedian: string | null,
  gradedMedian: string | null,
): string | null {
  if (!rawMedian || !gradedMedian) return null;
  const raw = Number(rawMedian);
  const graded = Number(gradedMedian);
  if (Number.isNaN(raw) || Number.isNaN(graded)) return null;
  return toDecimal(graded - raw);
}

function countOwnedCopies(copies: CardCopyOut[]): number {
  return copies.reduce((sum, copy) => sum + Math.max(copy.quantity, 1), 0);
}

function indexOwnedCopies(
  copies: CardCopyOut[],
): Map<string, CardCopyOut[]> {
  const index = new Map<string, CardCopyOut[]>();

  for (const copy of copies) {
    const current = index.get(copy.card_uuid) ?? [];
    current.push(copy);
    index.set(copy.card_uuid, current);
  }

  return index;
}

async function enrichParallels(
  parallels: CardOut[],
  ownedIndex: Map<string, CardCopyOut[]>,
): Promise<ParallelSummary[]> {
  const batchSize = 4;
  const summaries: ParallelSummary[] = [];

  for (let index = 0; index < parallels.length; index += batchSize) {
    const batch = parallels.slice(index, index + batchSize);
    const batchSummaries = await Promise.all(
      batch.map(async (card) => {
        let headlineFmv: string | null = card.market?.fair_market_value ?? null;

        if (!headlineFmv) {
          try {
            const market = await getCardMarket(card.uuid);
            const raw = pickRawPoint(market.price_points);
            headlineFmv = raw?.price_median ?? null;
          } catch {
            headlineFmv = null;
          }
        }

        return {
          card,
          headlineFmv,
          ownedCount: countOwnedCopies(ownedIndex.get(card.uuid) ?? []),
        };
      }),
    );
    summaries.push(...batchSummaries);
  }

  return summaries.sort((a, b) => {
    const aPrice = a.headlineFmv ? Number(a.headlineFmv) : -1;
    const bPrice = b.headlineFmv ? Number(b.headlineFmv) : -1;
    return bPrice - aPrice;
  });
}

export async function fetchCardDetail(
  cardUuid: string,
  gradeKey = "RAW",
): Promise<CardDetailResult> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - HISTORY_DAYS);

  const [market, comps, parallels, priceHistory, collection] = await Promise.all([
    getCardMarket(cardUuid),
    getCardComps(cardUuid, { grade_key: gradeKey, limit: COMP_LIMIT }),
    getCardParallels(cardUuid),
    getCardPriceHistory(cardUuid, {
      grade_key: gradeKey,
      interval: "daily",
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    }),
    fetchCollection({}),
  ]);

  const ownedIndex = indexOwnedCopies(collection.items ?? []);
  const ownedCopies = ownedIndex.get(cardUuid) ?? [];
  const parallelSummaries = await enrichParallels(
    parallels.filter((card) => card.uuid !== cardUuid),
    ownedIndex,
  );

  const rawPoint = pickRawPoint(market.price_points);
  const compSummary = summarizeComps(comps.comps, comps.total);
  const rawMedian = rawPoint?.price_median ?? null;

  const raw: RawPriceSummary | null = rawPoint
    ? {
        sampleSize: rawPoint.sample_size,
        median: rawMedian,
        low: rawPoint.price_low ?? compSummary.compMin,
        high: rawPoint.price_high ?? compSummary.compMax,
        lowConfidence: rawPoint.low_confidence ?? false,
        ...compSummary,
      }
    : comps.total > 0
      ? {
          sampleSize: 0,
          median: null,
          low: compSummary.compMin,
          high: compSummary.compMax,
          lowConfidence: true,
          ...compSummary,
        }
      : null;

  const graded = market.price_points
    .filter((point) => point.grade_key !== "RAW")
    .map((point) => ({
      gradeKey: point.grade_key,
      finish: point.finish,
      sampleSize: point.sample_size,
      median: point.price_median ?? null,
      low: point.price_low ?? null,
      high: point.price_high ?? null,
      lowConfidence: point.low_confidence ?? false,
      uplift: computeUplift(rawMedian, point.price_median ?? null),
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize);

  const gradeKeys = [
    ...new Set(market.price_points.map((point) => point.grade_key)),
  ].sort((a, b) => {
    if (a === "RAW") return -1;
    if (b === "RAW") return 1;
    return a.localeCompare(b);
  });

  return {
    cardUuid,
    market,
    raw,
    graded,
    comps,
    priceHistory,
    parallels: parallelSummaries,
    ownedCopies,
    gradeKeys,
  };
}
