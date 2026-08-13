import { primarySubjectName } from "@/lib/names";
import type { CardOut } from "@/lib/slab/types";

function cardNumberSortKey(cardNumber: string): number {
  const match = cardNumber.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

/** Pick a flagship base card for a roster slot (any_printing on this slot). */
export function pickRepresentativeCard(cards: CardOut[]): CardOut | null {
  if (!cards.length) return null;

  const base = cards.filter((card) => !card.finish?.trim());
  const pool = base.length ? base : cards;

  const sorted = [...pool].sort((a, b) => {
    const finishA = a.finish?.trim() ? 1 : 0;
    const finishB = b.finish?.trim() ? 1 : 0;
    if (finishA !== finishB) return finishA - finishB;

    const numDiff =
      cardNumberSortKey(a.card_number) - cardNumberSortKey(b.card_number);
    if (numDiff !== 0) return numDiff;

    return (a.set_name ?? "").localeCompare(b.set_name ?? "");
  });

  return sorted[0] ?? null;
}

export interface PlayerCardGroup {
  playerName: string;
  cards: CardOut[];
  representative: CardOut | null;
}

export function groupCardsByPlayer(cards: CardOut[]): PlayerCardGroup[] {
  const groups = new Map<string, CardOut[]>();

  for (const card of cards) {
    const playerName = primarySubjectName(card.subjects) || "Unknown";
    const current = groups.get(playerName) ?? [];
    current.push(card);
    groups.set(playerName, current);
  }

  return [...groups.entries()]
    .map(([playerName, playerCards]) => ({
      playerName,
      cards: playerCards,
      representative: pickRepresentativeCard(playerCards),
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

export interface RosterSlotResult {
  player: string;
  status: "added" | "skipped";
  cardUuid?: string;
  cardLabel?: string;
}
