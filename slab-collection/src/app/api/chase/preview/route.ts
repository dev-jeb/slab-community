import { NextResponse } from "next/server";

import {
  buildCardSearchQuery,
  buildFilterJson,
  type ChaseFilterInput,
  validateChaseFilter,
} from "@/lib/chase-filter";
import { groupCardsByPlayer } from "@/lib/roster-chase";
import { cardSubtitle, cardTitle } from "@/lib/slab/format";
import { fetchAllMatchingCards } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { filter?: ChaseFilterInput };
    const filter = body.filter ?? {};
    const validationError = validateChaseFilter(filter);

    if (validationError) {
      return NextResponse.json({ detail: validationError }, { status: 400 });
    }

    const searchQuery = buildCardSearchQuery(filter);
    const { cards, total } = await fetchAllMatchingCards(searchQuery);
    const playerGroups = groupCardsByPlayer(cards);

    const samplePlayers = playerGroups.slice(0, 12).map((group) => ({
      playerName: group.playerName,
      cardCount: group.cards.length,
      representativeLabel: group.representative
        ? `${cardTitle(group.representative)} — ${cardSubtitle(group.representative)}`
        : null,
    }));

    return NextResponse.json({
      total,
      playerCount: playerGroups.length,
      filterJson: buildFilterJson(filter),
      samplePlayers,
      rosterReady: playerGroups.some((group) => group.representative),
    });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
