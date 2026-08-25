import {
  fetchCollection,
  getCardComps,
  getCardMarket,
  getCardParallels,
  getCardPriceHistory,
  searchCards,
  searchCollection,
} from "@/lib/slab/client";
import type {
  CardComps,
  CardCopyOut,
  CardMarket,
  CardOut,
  CardPriceHistory,
  CompOut,
  Liquidity,
  PricePointOut,
} from "@/lib/slab/types";

const COMP_LIMIT = 50;
const HISTORY_DAYS = 90;

export interface RawPriceSummary {
  sampleSize: number;
  /** Confirmed-raw sales among the loaded comps — a floor, not the market-wide raw total. */
  compTotal: number;
  median: string | null;
  low: string | null;
  high: string | null;
  lowConfidence: boolean;
  /** How often the raw key actually sells; null on API builds without liquidity. */
  liquidity: Liquidity | null;
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
  liquidity: Liquidity | null;
}

/** One printing of a slot — the base or any parallel, including the one being viewed. */
export interface PrintingSummary {
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
  /** The WHOLE rainbow, this printing included, in one stable order.
   *
   *  The rail highlights the active one in place rather than hoisting it to the front: a rail that
   *  reorders under the click is what made picking a parallel read as a page change instead of a
   *  step sideways. Including the active printing also means its run size and FMV come from the
   *  same place as every other cell's, so the row of numbers is comparable. */
  printings: PrintingSummary[];
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

// Comp min/max survive only as a fallback range for cards with no trimmed price point — they're
// never shown beside one, because the raw extremes are exactly the outliers the median trims.
function summarizeComps(comps: CompOut[], total: number) {
  const prices = compPrices(comps);

  return {
    compTotal: total,
    compMin: prices.length ? toDecimal(Math.min(...prices)) : null,
    compMax: prices.length ? toDecimal(Math.max(...prices)) : null,
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

function summarizePrintings(
  printings: CardOut[],
  fmvByUuid: Map<string, string | null>,
  ownedIndex: Map<string, CardCopyOut[]>,
): PrintingSummary[] {
  return printings
    .map((card) => ({
      card,
      headlineFmv:
        card.market?.fair_market_value ?? fmvByUuid.get(card.uuid) ?? null,
      ownedCount: countOwnedCopies(ownedIndex.get(card.uuid) ?? []),
    }))
    // Base first, then parallels by value. The base is the printing everyone can name, so it
    // anchors the left end of the rail no matter which printing you're on; sorting it by price
    // would bury a $4 base between two parallels and move the rail's landmark around.
    .sort((a, b) => {
      const aBase = a.card.finish ? 0 : 1;
      const bBase = b.card.finish ? 0 : 1;
      if (aBase !== bBase) return bBase - aBase;
      const aPrice = a.headlineFmv ? Number(a.headlineFmv) : -1;
      const bPrice = b.headlineFmv ? Number(b.headlineFmv) : -1;
      return bPrice - aPrice;
    });
}

/**
 * A card slot addressed as a filter: same set, same number.
 *
 * `/cards/{uuid}/parallels` hands back the whole rainbow but carries no prices, and asking for each
 * one's market individually cost a round trip per parallel. Catalog search takes the same slot as
 * `set_slug` + `card_number` and will price the whole page in one call, so the rainbow costs one
 * request no matter how many finishes it has.
 */
function slotFilter(slot: CardOut): { set_slug: string[]; card_number: string } | null {
  if (!slot.set_slug || !slot.card_number) return null;
  return { set_slug: [slot.set_slug], card_number: slot.card_number };
}

export interface CardGradeSlice {
  gradeKey: string;
  priceHistory: CardPriceHistory;
}

/**
 * Only what actually changes when the History tab's grade selector changes: that grade's price
 * history. Everything else on the card page — market, rainbow, copies, and now the sales list —
 * is grade-independent: sales load once for ALL grades and the Sales tab filters them
 * client-side, so a grade press is one query, not a refetch of the page.
 */
export async function fetchCardGradeSlice(
  cardUuid: string,
  gradeKey: string,
): Promise<CardGradeSlice> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - HISTORY_DAYS);

  const priceHistory = await getCardPriceHistory(cardUuid, {
    grade_key: gradeKey,
    interval: "daily",
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  });

  return { gradeKey, priceHistory };
}


export async function fetchCardDetail(
  cardUuid: string,
  gradeKey = "RAW",
): Promise<CardDetailResult> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - HISTORY_DAYS);

  // Wave one: everything addressable by this card's uuid alone, in parallel.
  const [market, comps, parallels, priceHistory] = await Promise.all([
    getCardMarket(cardUuid),
    // No grade filter: the Sales tab shows the card's whole recent market and narrows
    // client-side. The raw fallback math below picks its own raw rows out of the mix.
    getCardComps(cardUuid, { limit: COMP_LIMIT }),
    getCardParallels(cardUuid),
    getCardPriceHistory(cardUuid, {
      grade_key: gradeKey,
      interval: "daily",
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    }),
  ]);

  // Wave two needs the slot's identity, which only the rainbow knows (it includes this card, so
  // there's always a member to read `set_slug` / `card_number` off).
  const slot = parallels.find((card) => card.uuid === cardUuid) ?? parallels[0];
  const filter = slot ? slotFilter(slot) : null;
  const slotUuids = new Set(parallels.map((card) => card.uuid));

  const [slotMarket, slotCopies] = await Promise.all([
    filter
      ? searchCards({ ...filter, include_market: true, limit: 100 })
      : Promise.resolve(null),
    // Copies of THIS slot, not the whole collection. Loading every copy you own to find the two
    // that belong to this card was the single slowest thing on the page — one page of 200 costs
    // ~3s, and a collection spans several.
    filter
      ? searchCollection({ set_slug: filter.set_slug, card_number: filter.card_number, limit: 200 })
      : fetchCollection({}),
  ]);

  // Both queries address the slot by (set, number) rather than by uuid, so anything they return
  // that isn't actually in this rainbow is dropped rather than trusted.
  const fmvByUuid = new Map<string, string | null>(
    (slotMarket?.items ?? [])
      .filter((card) => slotUuids.has(card.uuid))
      .map((card) => [card.uuid, card.market?.fair_market_value ?? null]),
  );

  const ownedIndex = indexOwnedCopies(
    (slotCopies.items ?? []).filter((copy) => slotUuids.has(copy.card_uuid)),
  );
  const ownedCopies = ownedIndex.get(cardUuid) ?? [];
  const printings = summarizePrintings(parallels, fmvByUuid, ownedIndex);

  const rawPoint = pickRawPoint(market.price_points);
  // The comps arrived unfiltered, so the raw summary filters for itself: confirmed-raw sales
  // only, or a PSA-9's price could sneak into the raw fallback range. `grade_unconfirmed` rows
  // are excluded too — they're nominally RAW but priced like graded copies.
  const rawComps = comps.comps.filter(
    (comp) => (comp.grade_key ?? "RAW") === "RAW" && !comp.grade_unconfirmed,
  );
  const compSummary = summarizeComps(rawComps, rawComps.length);
  const rawMedian = rawPoint?.price_median ?? null;

  const raw: RawPriceSummary | null = rawPoint
    ? {
        sampleSize: rawPoint.sample_size,
        compTotal: compSummary.compTotal,
        median: rawMedian,
        low: rawPoint.price_low ?? compSummary.compMin,
        high: rawPoint.price_high ?? compSummary.compMax,
        lowConfidence: rawPoint.low_confidence ?? false,
        liquidity: rawPoint.liquidity ?? null,
      }
    : rawComps.length > 0
      ? {
          sampleSize: 0,
          compTotal: compSummary.compTotal,
          median: null,
          low: compSummary.compMin,
          high: compSummary.compMax,
          lowConfidence: true,
          liquidity: null,
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
      liquidity: point.liquidity ?? null,
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
    printings,
    ownedCopies,
    gradeKeys,
  };
}
