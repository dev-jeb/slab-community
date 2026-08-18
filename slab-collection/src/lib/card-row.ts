import type { CardCopyOut, CardOut } from "@/lib/slab/types";

/**
 * One row of a card search, whichever scope it came from.
 *
 * The collection and the catalog are the same question asked over two sets of cards — "which cards
 * match this?" — so they render through one tile and one list row. What differs is how much is
 * known about each: a collection row is a copy you own (it has a grade, a serial, what you paid),
 * a catalog row is the printing itself (it has a print run, pack odds, and how many of it you
 * happen to own). Everything shared — who's on it, which set, what it's worth — lives here.
 *
 * Copy-shaped fields are optional rather than defaulted, so the renderers can drop those blocks
 * entirely for a catalog row instead of printing "—" where a cost basis would be.
 */
export interface CardRow {
  /** Stable list key. A copy is unique by its own uuid; a catalog row by the card's. */
  key: string;
  cardUuid: string;
  card?: CardOut | null;
  fmv?: string | null;
  sampleSize?: number | null;
  lowConfidence?: boolean | null;
  /** Copies of this card you own — dupes in the collection, `owned_quantity` in the catalog. */
  ownedCount?: number | null;
  /** Present only for a collection row: the physical copy this row IS. */
  copy?: CardCopyOut | null;
  /** Printings in this card's slot (base + parallels), when the search collapsed them. */
  printingCount?: number | null;
}

export function rowFromCopy(copy: CardCopyOut, ownedTotal?: number): CardRow {
  return {
    key: copy.uuid,
    cardUuid: copy.card_uuid,
    card: copy.card,
    fmv: copy.market?.fair_market_value,
    sampleSize: copy.market?.sample_size,
    lowConfidence: copy.market?.low_confidence,
    ownedCount: ownedTotal,
    copy,
  };
}

export function rowFromCard(card: CardOut): CardRow {
  return {
    key: card.uuid,
    cardUuid: card.uuid,
    card,
    fmv: card.market?.fair_market_value,
    sampleSize: card.market?.sample_size,
    lowConfidence: card.market?.low_confidence,
    ownedCount: card.owned_quantity,
    printingCount: card.printing_count,
  };
}
