import { setLabel } from "@/lib/set-label";
import type { SetOut } from "@/lib/slab/types";

export type SetLookupSort =
  | "release_desc"
  | "release_asc"
  | "cards_desc"
  | "priced_desc"
  | "pct_priced_desc";

/**
 * When a product hit shelves, as a sortable number.
 *
 * `year` is the SEASON (2025 for a 2025-26 product) and a season's products ship across fourteen
 * months, so ordering by it ties a whole season together and ranks 2025-26 MVP (July 2025) above
 * 2024-25 Ultimate Collection (October 2025). `release_date` is the honest answer — but only sets
 * whose overview has been ingested carry one, so an unknown release falls back to Jan 1 of the
 * season's second calendar year: the middle of that season's release window, which keeps it among
 * its own season rather than sinking past 2010. Same rule as the API's `-release` sort, so the
 * product list and the card search agree on what "newest" means.
 */
function releasedAt(set: SetOut): number {
  if (set.release_date) {
    // Noon, not midnight: a bare `YYYY-MM-DD` parses as UTC, so west of Greenwich the date lands
    // on the previous day — enough to flip two releases that shipped a day apart.
    const parsed = Date.parse(`${set.release_date}T12:00:00`);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return set.year ? Date.UTC(set.year + 1, 0, 1) : Number.NaN;
}

export function pricedPercent(set: SetOut): number | null {
  const cards = set.card_count;
  const priced = set.priced_count;
  if (cards == null || cards <= 0 || priced == null) return null;
  return (priced / cards) * 100;
}

/** `releasedAt` for a set that may not be placeable at all — `unknown` is where those land. */
function placeOnTimeline(set: SetOut, unknown: number): number {
  const at = releasedAt(set);
  return Number.isNaN(at) ? unknown : at;
}

function compareName(a: SetOut, b: SetOut): number {
  return setLabel(a).localeCompare(setLabel(b));
}

export function sortCatalogSets(
  sets: SetOut[],
  sort: SetLookupSort,
): SetOut[] {
  return [...sets].sort((a, b) => {
    // A set with neither a release date nor a season can't be placed on the timeline, so it sorts
    // last in BOTH directions rather than looking like the newest (or the oldest) thing here.
    if (sort === "release_desc") {
      const releaseA = placeOnTimeline(a, 0);
      const releaseB = placeOnTimeline(b, 0);
      if (releaseB !== releaseA) return releaseB - releaseA;
      return compareName(a, b);
    }

    if (sort === "release_asc") {
      const releaseA = placeOnTimeline(a, Number.MAX_SAFE_INTEGER);
      const releaseB = placeOnTimeline(b, Number.MAX_SAFE_INTEGER);
      if (releaseA !== releaseB) return releaseA - releaseB;
      return compareName(a, b);
    }

    if (sort === "cards_desc") {
      const cardsA = a.card_count ?? 0;
      const cardsB = b.card_count ?? 0;
      if (cardsB !== cardsA) return cardsB - cardsA;
      return compareName(a, b);
    }

    if (sort === "priced_desc") {
      const pricedA = a.priced_count ?? 0;
      const pricedB = b.priced_count ?? 0;
      if (pricedB !== pricedA) return pricedB - pricedA;
      return compareName(a, b);
    }

    const pctA = pricedPercent(a) ?? -1;
    const pctB = pricedPercent(b) ?? -1;
    if (pctB !== pctA) return pctB - pctA;
    return compareName(a, b);
  });
}

export function formatPricedPercent(set: SetOut): string {
  const pct = pricedPercent(set);
  if (pct == null) return "—";
  return `${Math.round(pct)}%`;
}
