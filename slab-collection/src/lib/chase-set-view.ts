import { primarySubjectName } from "@/lib/names";
import { cardSubtitle, cardTitle } from "@/lib/slab/format";
import type { CustomSetCardOut } from "@/lib/slab/types";

export type ChaseEntryFilter = "all" | "owned" | "missing";
export type ChaseViewMode = "player" | "card";

export interface PlayerChaseGroup {
  playerName: string;
  entries: CustomSetCardOut[];
  owned: boolean;
  ownedCount: number;
  totalCount: number;
}

export function groupChaseEntriesByPlayer(
  entries: CustomSetCardOut[],
): PlayerChaseGroup[] {
  const groups = new Map<string, CustomSetCardOut[]>();

  for (const entry of entries) {
    const playerName = primarySubjectName(entry.card?.subjects) || "Unknown";
    const current = groups.get(playerName) ?? [];
    current.push(entry);
    groups.set(playerName, current);
  }

  return [...groups.entries()]
    .map(([playerName, playerEntries]) => ({
      playerName,
      entries: playerEntries,
      owned: playerEntries.some((item) => item.owned),
      ownedCount: playerEntries.filter((item) => item.owned).length,
      totalCount: playerEntries.length,
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

export function filterChaseEntries(
  entries: CustomSetCardOut[],
  filter: ChaseEntryFilter,
): CustomSetCardOut[] {
  if (filter === "owned") return entries.filter((entry) => entry.owned);
  if (filter === "missing") return entries.filter((entry) => !entry.owned);
  return entries;
}

export function filterPlayerGroups(
  groups: PlayerChaseGroup[],
  filter: ChaseEntryFilter,
): PlayerChaseGroup[] {
  if (filter === "owned") return groups.filter((group) => group.owned);
  if (filter === "missing") return groups.filter((group) => !group.owned);
  return groups;
}

export function searchChaseEntries(
  entries: CustomSetCardOut[],
  query: string,
): CustomSetCardOut[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return entries;

  return entries.filter((entry) => {
    const card = entry.card;
    const haystack = [
      primarySubjectName(card?.subjects),
      cardTitle(card),
      cardSubtitle(card),
      card?.card_number,
      card?.set_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });
}

export function searchPlayerGroups(
  groups: PlayerChaseGroup[],
  query: string,
): PlayerChaseGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return groups;

  return groups.filter((group) => {
    if (group.playerName.toLowerCase().includes(needle)) return true;
    return group.entries.some((entry) =>
      searchChaseEntries([entry], query).length > 0,
    );
  });
}

export function defaultChaseViewMode(cardCount: number): ChaseViewMode {
  return cardCount > 40 ? "player" : "card";
}
