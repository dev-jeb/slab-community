import { compareLastName, primarySubjectName } from "@/lib/names";
import type { CardCopyOut, CardOut } from "@/lib/slab/types";

/**
 * The two axes the collection page is browsed along, deliberately separate.
 *
 * They used to be one enum, which put "Autos" and "Teams" side by side as if they were the same
 * kind of choice. They aren't: one narrows the collection, the other changes how it's presented —
 * and because they were fused, you couldn't ask for "my rookies, by set", even though the API has
 * supported exactly that since the grouped endpoints took the full filter grammar.
 */

/** How the collection is PRESENTED: a list of cards, or rolled up. */
export type CollectionBrowseMode = "cards" | "sets" | "teams" | "duplicates";

/** What NARROWS it. Applies inside every browse mode. */
export type CollectionFilter = "all" | "auto" | "rookie" | "numbered";

/** @deprecated The fused enum. Kept only for helpers that still take it. */
export type CollectionCategoryFilter =
  | "all"
  | "auto"
  | "rookie"
  | "numbered"
  | "teams"
  | "by_set"
  | "duplicates";

export function copyTeams(copy: CardCopyOut): string[] {
  const teams =
    copy.card?.subjects
      .map((subject) => subject.team?.trim())
      .filter((team): team is string => Boolean(team)) ?? [];

  return [...new Set(teams)];
}

export function copyHasTeam(copy: CardCopyOut): boolean {
  return copyTeams(copy).length > 0;
}

export function groupByTeam(
  items: CardCopyOut[],
): { team: string; copies: CardCopyOut[] }[] {
  const groups = new Map<string, CardCopyOut[]>();

  for (const copy of items) {
    for (const team of copyTeams(copy)) {
      const current = groups.get(team) ?? [];
      current.push(copy);
      groups.set(team, current);
    }
  }

  return [...groups.entries()].map(([team, copies]) => ({ team, copies }));
}

export type TeamGroupSort = "players_desc" | "cards_desc" | "alpha";

export function countUniqueTeamPlayers(
  copies: CardCopyOut[],
  team: string,
): number {
  const names = new Set<string>();

  for (const copy of copies) {
    for (const subject of copy.card?.subjects ?? []) {
      if (subject.team?.trim() === team && subject.name?.trim()) {
        names.add(subject.name.trim());
      }
    }
  }

  return names.size;
}

export interface TeamGroup {
  team: string;
  copies: CardCopyOut[];
  playerCount: number;
}

export function sortTeamGroups(
  groups: { team: string; copies: CardCopyOut[] }[],
  sort: TeamGroupSort,
): TeamGroup[] {
  const withCounts = groups.map((group) => ({
    ...group,
    playerCount: countUniqueTeamPlayers(group.copies, group.team),
  }));

  return withCounts.sort((a, b) => {
    if (sort === "players_desc") {
      if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
      return a.team.localeCompare(b.team);
    }

    if (sort === "cards_desc") {
      if (b.copies.length !== a.copies.length) {
        return b.copies.length - a.copies.length;
      }
      return a.team.localeCompare(b.team);
    }

    return a.team.localeCompare(b.team);
  });
}

export function copySetName(copy: CardCopyOut): string {
  return copy.card?.set_name?.trim() || "Unknown set";
}

export function copyHasSet(copy: CardCopyOut): boolean {
  return Boolean(copy.card?.set_name?.trim());
}

export function groupBySet(
  items: CardCopyOut[],
): { setName: string; copies: CardCopyOut[] }[] {
  const groups = new Map<string, CardCopyOut[]>();

  for (const copy of items) {
    const setName = copySetName(copy);
    const current = groups.get(setName) ?? [];
    current.push(copy);
    groups.set(setName, current);
  }

  return [...groups.entries()].map(([setName, copies]) => ({ setName, copies }));
}

export function setGroupValue(copies: CardCopyOut[]): number {
  return copies.reduce(
    (sum, copy) => sum + Number(copy.market?.fair_market_value ?? 0),
    0,
  );
}

export type SetGroupSort = "cards_desc" | "value_desc" | "alpha";

export interface SetGroup {
  setName: string;
  copies: CardCopyOut[];
  cardCount: number;
  totalValue: number;
  season?: string | null;
  year?: number | null;
  brand?: string | null;
}

export function sortSetGroups(
  groups: { setName: string; copies: CardCopyOut[] }[],
  sort: SetGroupSort,
): SetGroup[] {
  const enriched = groups.map((group) => {
    const sample = group.copies[0]?.card;
    return {
      ...group,
      cardCount: group.copies.length,
      totalValue: setGroupValue(group.copies),
      season: sample?.season,
      year: sample?.year,
      brand: sample?.brand,
    };
  });

  return enriched.sort((a, b) => {
    if (sort === "value_desc") {
      if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
      return a.setName.localeCompare(b.setName);
    }

    if (sort === "cards_desc") {
      if (b.cardCount !== a.cardCount) return b.cardCount - a.cardCount;
      return a.setName.localeCompare(b.setName);
    }

    return a.setName.localeCompare(b.setName);
  });
}

export function filterByCategory(
  items: CardCopyOut[],
  category: CollectionCategoryFilter,
): CardCopyOut[] {
  if (category === "teams") {
    return items.filter(copyHasTeam);
  }
  if (category === "by_set") {
    return items.filter(copyHasSet);
  }
  return items;
}

/** The API filter params a filter selection stands for. Applies to card and grouped requests alike. */
export function categoryQueryParams(
  category: CollectionFilter,
): Record<string, string> {
  switch (category) {
    case "auto":
      return { auto: "true" };
    case "rookie":
      return { rookie: "true" };
    case "numbered":
      return { is_numbered: "true" };
    default:
      return {};
  }
}

export function categoryFetchLimit(_category: CollectionCategoryFilter): number {
  return 100;
}

export function countCopyQuantity(copies: CardCopyOut[]): number {
  return copies.reduce((sum, copy) => sum + Math.max(copy.quantity, 1), 0);
}

export interface DuplicateGroup {
  cardUuid: string;
  card: CardOut | null;
  copies: CardCopyOut[];
  totalCount: number;
  totalValue: number;
}

export function groupByCardUuid(items: CardCopyOut[]): DuplicateGroup[] {
  const groups = new Map<string, CardCopyOut[]>();

  for (const copy of items) {
    const current = groups.get(copy.card_uuid) ?? [];
    current.push(copy);
    groups.set(copy.card_uuid, current);
  }

  return [...groups.entries()].map(([cardUuid, copies]) => ({
    cardUuid,
    card: copies[0]?.card ?? null,
    copies,
    totalCount: countCopyQuantity(copies),
    totalValue: copies.reduce(
      (sum, copy) => sum + Number(copy.market?.fair_market_value ?? 0),
      0,
    ),
  }));
}

export function duplicateGroupsOnly(groups: DuplicateGroup[]): DuplicateGroup[] {
  return groups.filter(
    (group) => group.copies.length > 1 || group.totalCount > 1,
  );
}

export function countDuplicateCards(items: CardCopyOut[]): number {
  return duplicateGroupsOnly(groupByCardUuid(items)).length;
}

export function ownedCountByCardUuid(items: CardCopyOut[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const group of groupByCardUuid(items)) {
    counts.set(group.cardUuid, group.totalCount);
  }

  return counts;
}

export type DuplicateGroupSort = "copies_desc" | "value_desc" | "alpha";

export function sortDuplicateGroups(
  groups: DuplicateGroup[],
  sort: DuplicateGroupSort,
): DuplicateGroup[] {
  return [...groups].sort((a, b) => {
    if (sort === "copies_desc") {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return b.totalValue - a.totalValue;
    }

    if (sort === "value_desc") {
      if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
      return b.totalCount - a.totalCount;
    }

    const nameCompare = compareLastName(
      primarySubjectName(a.card?.subjects),
      primarySubjectName(b.card?.subjects),
    );
    if (nameCompare !== 0) return nameCompare;
    return (a.card?.set_name ?? "").localeCompare(b.card?.set_name ?? "");
  });
}
