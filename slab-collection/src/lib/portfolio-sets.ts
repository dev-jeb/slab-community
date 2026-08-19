import {
  groupBySet,
  sortSetGroups,
} from "@/lib/collection-filters";
import type { CardCopyOut } from "@/lib/slab/types";

export interface SetPortfolioSummary {
  label: string;
  count: number;
  value: number;
  /** Share of copies that have an FMV, 0–1. */
  pricedShare: number | null;
  setSlug: string | null;
}

export function buildTopSetsByValue(
  copies: CardCopyOut[],
  limit = 10,
): SetPortfolioSummary[] {
  return sortSetGroups(groupBySet(copies), "value_desc")
    .slice(0, limit)
    .map((group) => {
      const priced = group.copies.filter(
        (copy) => copy.market?.fair_market_value,
      ).length;
      const slug =
        group.copies
          .map((copy) => copy.card?.set_slug?.trim())
          .find((value): value is string => Boolean(value)) ?? null;

      return {
        label: group.setName,
        count: group.cardCount,
        value: group.totalValue,
        pricedShare: group.cardCount > 0 ? priced / group.cardCount : null,
        setSlug: slug,
      };
    });
}
