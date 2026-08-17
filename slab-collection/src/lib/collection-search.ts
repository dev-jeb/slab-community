import {
  copyTeams,
  countUniqueTeamPlayers,
  duplicateGroupsOnly,
  groupByCardUuid,
  groupByParallelFamily,
  parallelGroupsOnly,
} from "@/lib/collection-filters";
import {
  TEAM_PLAYERS_SORT,
  type GroupSortOption,
} from "@/lib/collection-paging";
import { compareLastName, primarySubjectName } from "@/lib/names";
import type {
  CardCopyOut,
  DuplicateGroupOut,
  ParallelGroupOut,
  SetGroupOut,
  TeamGroupOut,
} from "@/lib/slab/types";

/**
 * Slab's collection `q` only matches player name, set name, and card number. Inserts (Young Guns),
 * parallels (Outburst), attributes, and the rest of the printed text live on other fields — so the
 * collection page matches those here, over a fully-loaded result, instead of sending `q`.
 */
function copySearchHaystack(copy: CardCopyOut): string {
  const card = copy.card;
  const parts = [
    card?.set_name,
    card?.subset,
    card?.finish,
    card?.card_number,
    card?.release_set_name,
    card?.brand,
    card?.season,
    card?.year != null ? String(card.year) : null,
    card?.odds,
    card?.print_run != null ? `/${card.print_run}` : null,
    ...(card?.subjects?.flatMap((subject) => [subject.name, subject.team]) ?? []),
    ...(card?.attributes?.flatMap((attribute) => [
      attribute.name,
      attribute.value,
    ]) ?? []),
    copy.notes,
    copy.grading_company,
    copy.grade,
    copy.serial_number != null ? String(copy.serial_number) : null,
  ];

  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase();
}

export function copyMatchesSearch(copy: CardCopyOut, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = copySearchHaystack(copy);
  return needle.split(/\s+/).every((token) => haystack.includes(token));
}

export function filterCopiesBySearch(
  copies: CardCopyOut[],
  query: string,
): CardCopyOut[] {
  const needle = query.trim();
  if (!needle) return copies;
  return copies.filter((copy) => copyMatchesSearch(copy, needle));
}

function groupValue(copies: CardCopyOut[]): string | null {
  let sum = 0;
  let priced = false;

  for (const copy of copies) {
    const raw = copy.market?.fair_market_value;
    if (raw == null || raw === "") continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;
    priced = true;
    sum += value;
  }

  return priced ? sum.toFixed(2) : null;
}

function valueSortKey(totalValue?: string | null): number {
  // Unpriced is unknown, not zero — for "highest value" it belongs at the bottom, not the top.
  if (totalValue == null) return Number.NEGATIVE_INFINITY;
  const value = Number(totalValue);
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function compareGroupSort(
  sort: GroupSortOption,
  a: { total_value?: string | null; copy_count: number; name: string; player_count?: number },
  b: { total_value?: string | null; copy_count: number; name: string; player_count?: number },
): number {
  if (sort === TEAM_PLAYERS_SORT) {
    const players = (b.player_count ?? 0) - (a.player_count ?? 0);
    if (players !== 0) return players;
    return a.name.localeCompare(b.name);
  }

  if (sort === "-value" || sort === "value") {
    const diff = valueSortKey(b.total_value) - valueSortKey(a.total_value);
    const signed = sort === "-value" ? diff : -diff;
    if (signed !== 0) return signed;
    return a.name.localeCompare(b.name);
  }

  if (sort === "-copies" || sort === "copies") {
    const diff = b.copy_count - a.copy_count;
    const signed = sort === "-copies" ? diff : -diff;
    if (signed !== 0) return signed;
    return a.name.localeCompare(b.name);
  }

  const names = a.name.localeCompare(b.name);
  return sort === "-name" ? -names : names;
}

export function setGroupsFromCopies(
  copies: CardCopyOut[],
  sort: GroupSortOption,
): SetGroupOut[] {
  const grouped = new Map<string, CardCopyOut[]>();

  for (const copy of copies) {
    const slug =
      copy.card?.set_slug?.trim() || copy.card?.set_name?.trim() || "unknown";
    const current = grouped.get(slug) ?? [];
    current.push(copy);
    grouped.set(slug, current);
  }

  const groups: SetGroupOut[] = [...grouped.entries()].map(([slug, groupCopies]) => {
    const sample = groupCopies[0]?.card;
    return {
      set_uuid: slug,
      set_slug: slug,
      name: sample?.set_name?.trim() || "Unknown set",
      brand: sample?.brand,
      season: sample?.season,
      year: sample?.year,
      copy_count: groupCopies.length,
      card_count: new Set(groupCopies.map((copy) => copy.card_uuid)).size,
      total_value: groupValue(groupCopies),
      copies: groupCopies,
    };
  });

  return groups.sort((a, b) =>
    compareGroupSort(sort, { ...a, name: a.name }, { ...b, name: b.name }),
  );
}

export function teamGroupsFromCopies(
  copies: CardCopyOut[],
  sort: GroupSortOption,
): TeamGroupOut[] {
  const grouped = new Map<string, CardCopyOut[]>();

  for (const copy of copies) {
    for (const team of copyTeams(copy)) {
      const current = grouped.get(team) ?? [];
      current.push(copy);
      grouped.set(team, current);
    }
  }

  const groups: TeamGroupOut[] = [...grouped.entries()].map(([name, groupCopies]) => ({
    name,
    copy_count: groupCopies.length,
    player_count: countUniqueTeamPlayers(groupCopies, name),
    total_value: groupValue(groupCopies),
    copies: groupCopies,
  }));

  return groups.sort((a, b) => compareGroupSort(sort, a, b));
}

export function duplicateGroupsFromCopies(
  copies: CardCopyOut[],
  sort: GroupSortOption,
): DuplicateGroupOut[] {
  const groups: DuplicateGroupOut[] = duplicateGroupsOnly(groupByCardUuid(copies))
    .filter((group) => group.card)
    .map((group) => ({
      card: group.card!,
      copy_count: group.totalCount,
      total_value: groupValue(group.copies),
      copies: group.copies,
    }));

  return groups.sort((a, b) => {
    if (sort === "name" || sort === "-name") {
      const names = compareLastName(
        primarySubjectName(a.card.subjects),
        primarySubjectName(b.card.subjects),
      );
      if (names !== 0) return sort === "-name" ? -names : names;
      return (a.card.set_name ?? "").localeCompare(b.card.set_name ?? "");
    }

    return compareGroupSort(
      sort,
      { ...a, name: primarySubjectName(a.card.subjects) },
      { ...b, name: primarySubjectName(b.card.subjects) },
    );
  });
}

export function parallelGroupsFromCopies(
  copies: CardCopyOut[],
  sort: GroupSortOption,
): ParallelGroupOut[] {
  const groups: ParallelGroupOut[] = parallelGroupsOnly(groupByParallelFamily(copies))
    .filter((group) => group.card)
    .map((group) => ({
      family_key: group.familyKey,
      card: group.card!,
      printing_count: group.printingCount,
      copy_count: group.totalCount,
      total_value: groupValue(group.copies),
      copies: group.copies,
    }));

  return groups.sort((a, b) => {
    if (sort === "name" || sort === "-name") {
      const names = compareLastName(
        primarySubjectName(a.card.subjects),
        primarySubjectName(b.card.subjects),
      );
      if (names !== 0) return sort === "-name" ? -names : names;
      return (a.card.set_name ?? "").localeCompare(b.card.set_name ?? "");
    }

    return compareGroupSort(
      sort,
      {
        ...a,
        copy_count: a.printing_count,
        name: primarySubjectName(a.card.subjects),
      },
      {
        ...b,
        copy_count: b.printing_count,
        name: primarySubjectName(b.card.subjects),
      },
    );
  });
}
