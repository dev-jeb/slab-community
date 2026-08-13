import { compareCardNumbers, compareLastName, primarySubjectName } from "@/lib/names";
import { confidenceScore } from "@/lib/slab/confidence";
import type { CardCopyOut } from "@/lib/slab/types";

export type CollectionSortOption =
  | "value_desc"
  | "confidence_desc"
  | "card_number_asc"
  | "card_number_desc"
  | "alpha_asc";

function copyTieBreak(a: CardCopyOut, b: CardCopyOut): number {
  const setCompare = (a.card?.set_name ?? "").localeCompare(b.card?.set_name ?? "");
  if (setCompare !== 0) return setCompare;

  const subsetCompare = (a.card?.subset ?? "").localeCompare(b.card?.subset ?? "");
  if (subsetCompare !== 0) return subsetCompare;

  const finishCompare = (a.card?.finish ?? "").localeCompare(b.card?.finish ?? "");
  if (finishCompare !== 0) return finishCompare;

  const numberCompare = compareCardNumbers(
    a.card?.card_number,
    b.card?.card_number,
  );
  if (numberCompare !== 0) return numberCompare;

  return a.uuid.localeCompare(b.uuid);
}

export function sortCollectionCopies(
  items: CardCopyOut[],
  sort: CollectionSortOption,
): CardCopyOut[] {
  const sorted = [...items];

  if (sort === "value_desc") {
    return sorted.sort((a, b) => {
      const valueDiff =
        Number(b.market?.fair_market_value ?? 0) -
        Number(a.market?.fair_market_value ?? 0);
      if (valueDiff !== 0) return valueDiff;
      return copyTieBreak(a, b);
    });
  }

  if (sort === "card_number_asc") {
    return sorted.sort((a, b) => {
      const numberCompare = compareCardNumbers(
        a.card?.card_number,
        b.card?.card_number,
      );
      if (numberCompare !== 0) return numberCompare;
      return copyTieBreak(a, b);
    });
  }

  if (sort === "card_number_desc") {
    return sorted.sort((a, b) => {
      const numberCompare = compareCardNumbers(
        b.card?.card_number,
        a.card?.card_number,
      );
      if (numberCompare !== 0) return numberCompare;
      return copyTieBreak(a, b);
    });
  }

  if (sort === "confidence_desc") {
    return sorted.sort((a, b) => {
      const confA = confidenceScore(
        a.market?.sample_size,
        a.market?.low_confidence,
      );
      const confB = confidenceScore(
        b.market?.sample_size,
        b.market?.low_confidence,
      );
      if (confB !== confA) return confB - confA;

      const sampleDiff =
        (b.market?.sample_size ?? 0) - (a.market?.sample_size ?? 0);
      if (sampleDiff !== 0) return sampleDiff;

      return copyTieBreak(a, b);
    });
  }

  return sorted.sort((a, b) => {
    const nameCompare = compareLastName(
      primarySubjectName(a.card?.subjects),
      primarySubjectName(b.card?.subjects),
    );
    if (nameCompare !== 0) return nameCompare;
    return copyTieBreak(a, b);
  });
}
