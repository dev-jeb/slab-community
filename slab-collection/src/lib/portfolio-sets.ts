import {
  groupBySet,
  sortSetGroups,
} from "@/lib/collection-filters";
import type { CardCopyOut } from "@/lib/slab/types";

export interface SetPortfolioSummary {
  label: string;
  count: number;
  value: number;
}

export function buildTopSetsByValue(
  copies: CardCopyOut[],
  limit = 10,
): SetPortfolioSummary[] {
  return sortSetGroups(groupBySet(copies), "value_desc")
    .slice(0, limit)
    .map((group) => ({
      label: group.setName,
      count: group.cardCount,
      value: group.totalValue,
    }));
}
