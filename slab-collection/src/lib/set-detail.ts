import {
  fetchAllSets,
  getSetSealed,
  getSetTopCards,
} from "@/lib/slab/client";
import type { SealedProductOut, SetOut, SetTopCards } from "@/lib/slab/types";

/** Everything the set page needs on arrival — the product, its sealed SKUs, its best cards. */
export interface SetDetailResult {
  set: SetOut;
  /** Sealed SKUs, priced first and then by format, so the box people quote leads. */
  sealed: SealedProductOut[];
  topCards: SetTopCards;
}

/**
 * The order sealed SKUs are shown in.
 *
 * A hobby box is the number people quote when they ask what a product costs, so it leads; the
 * case is the next thing anyone asks about. Retail formats follow in descending size. Anything the
 * catalog grows later sorts after these by name rather than vanishing.
 */
const FORMAT_ORDER = [
  "hobby_box",
  "hobby_case",
  "blaster_box",
  "mega_box",
  "retail_box",
  "retail_case",
  "tin",
  "fat_pack",
  "hanger",
  "hobby_pack",
  "retail_pack",
  "starter",
];

export function formatLabel(format: string): string {
  return format.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRank(format: string): number {
  const index = FORMAT_ORDER.indexOf(format);
  return index === -1 ? FORMAT_ORDER.length : index;
}

/**
 * A set addressed by uuid.
 *
 * There is deliberately no `GET /sets/{uuid}` on the API — a set is reached through
 * `POST /sets/search` — and that search filters by name, brand, year and sport, not by uuid. So
 * the header comes from the full product list, which is a hundred-odd rows and already an endpoint
 * this app calls. Cheaper than teaching the API a new route for one page; revisit if the catalog
 * grows past the point where "fetch them all" is honest.
 */
export async function buildSetDetail(
  setUuid: string,
): Promise<SetDetailResult | null> {
  const [sets, sealed, topCards] = await Promise.all([
    fetchAllSets(),
    // A set with no ingested overview has no SKUs, and one nobody has sold has no top cards.
    // Neither is an error — the page says so — so a failure here shouldn't take the page down.
    getSetSealed(setUuid).catch(() => [] as SealedProductOut[]),
    getSetTopCards(setUuid).catch(
      () => ({ set_uuid: setUuid, cards: [] }) as SetTopCards,
    ),
  ]);

  const set = sets.find((candidate) => candidate.uuid === setUuid);
  if (!set) return null;

  const ordered = [...sealed].sort((a, b) => {
    // Priced SKUs first: an unpriced format is a fact about the catalog, not a product anyone is
    // shopping, and it shouldn't be the cell the page opens on.
    const aPriced = a.price_median ? 0 : 1;
    const bPriced = b.price_median ? 0 : 1;
    if (aPriced !== bPriced) return aPriced - bPriced;

    const rank = formatRank(a.format) - formatRank(b.format);
    if (rank !== 0) return rank;
    return a.format.localeCompare(b.format);
  });

  return { set, sealed: ordered, topCards };
}
