import { setLabel } from "@/lib/set-label";
import type { SetOut } from "@/lib/slab/types";

export type SetLookupSort =
  | "year_desc"
  | "year_asc"
  | "cards_desc"
  | "priced_desc"
  | "pct_priced_desc";

export function pricedPercent(set: SetOut): number | null {
  const cards = set.card_count;
  const priced = set.priced_count;
  if (cards == null || cards <= 0 || priced == null) return null;
  return (priced / cards) * 100;
}

function compareName(a: SetOut, b: SetOut): number {
  return setLabel(a).localeCompare(setLabel(b));
}

export function sortCatalogSets(
  sets: SetOut[],
  sort: SetLookupSort,
): SetOut[] {
  return [...sets].sort((a, b) => {
    if (sort === "year_desc") {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearB !== yearA) return yearB - yearA;
      return compareName(a, b);
    }

    if (sort === "year_asc") {
      const yearA = a.year ?? Number.MAX_SAFE_INTEGER;
      const yearB = b.year ?? Number.MAX_SAFE_INTEGER;
      if (yearA !== yearB) return yearA - yearB;
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
