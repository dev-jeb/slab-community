import { primarySubjectName } from "@/lib/names";
import { cardSubtitle, cardTitle } from "@/lib/slab/format";
import type { CustomSetCardOut } from "@/lib/slab/types";

export type ChaseEntryFilter = "all" | "owned" | "missing";
export type ChaseViewMode = "player" | "card";

/** The player an entry is about — the subject itself for player slots (any_card),
 * else the card's primary subject. */
export function entryPlayerName(entry: CustomSetCardOut): string {
  if (entry.subject) return entry.subject;
  return primarySubjectName(entry.card?.subjects) || "Unknown";
}

/** Season formatted the hobby way: 2025 -> "2025-26". */
export function seasonLabel(year: number): string {
  return `${year}-${String(year + 1).slice(-2)}`;
}

/** A player slot's qualifier chips, e.g. ["2025-26", "Hurricanes", "Autograph"]. */
export function playerSlotQualifiers(entry: CustomSetCardOut): string[] {
  return [
    entry.subject_year ? seasonLabel(entry.subject_year) : null,
    entry.subject_team ?? null,
    entry.subject_attribute ?? null,
  ].filter((value): value is string => Boolean(value));
}

/** What a missing player slot needs, in words: "any 2025-26 Hurricanes card". */
export function playerSlotNeed(entry: CustomSetCardOut): string {
  const quals = playerSlotQualifiers(entry);
  return quals.length ? `any ${quals.join(" ")} card` : "any card";
}

/** The team to badge an entry with — the card's printed team, or the slot's team qualifier. */
export function entryTeam(entry: CustomSetCardOut): string | null {
  const cardTeam = entry.card?.subjects.find((subject) => subject.team?.trim())?.team;
  return cardTeam ?? entry.subject_team ?? null;
}

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
    const playerName = entryPlayerName(entry);
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
      entryPlayerName(entry),
      card ? cardTitle(card) : null,
      card ? cardSubtitle(card) : null,
      card?.card_number,
      card?.set_name,
      ...playerSlotQualifiers(entry),
      entry.owned_printing,
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
