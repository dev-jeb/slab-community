import { NextResponse } from "next/server";

import {
  buildCardSearchQuery,
  buildFilterJson,
  type ChaseCreateRequest,
  validateChaseFilter,
} from "@/lib/chase-filter";
import { groupCardsByPlayer } from "@/lib/roster-chase";
import { cardSubtitle, cardTitle } from "@/lib/slab/format";
import {
  addCustomSetCard,
  createCustomSet,
  fetchAllMatchingCards,
  SlabApiError,
} from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChaseCreateRequest;

    if (!body.name?.trim()) {
      return NextResponse.json({ detail: "Set name is required." }, { status: 400 });
    }

    const validationError = validateChaseFilter(body.filter ?? {});
    if (validationError) {
      return NextResponse.json({ detail: validationError }, { status: 400 });
    }

    const filterJson = buildFilterJson(body.filter);

    const visibility = body.visibility === "public" ? "public" : "private";

    if (body.mode === "master") {
      const set = await createCustomSet({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        set_type: "dynamic",
        visibility,
        filter_json: filterJson,
      });

      return NextResponse.json({
        set,
        mode: "master",
        added: 0,
        totalCards: null,
        playerCount: null,
      });
    }

    const searchQuery = buildCardSearchQuery(body.filter);
    const { cards, total } = await fetchAllMatchingCards(searchQuery);
    const playerGroups = groupCardsByPlayer(cards);

    if (!playerGroups.length) {
      return NextResponse.json(
        {
          detail:
            "No catalog cards match these filters. Try loosening base-only or other restrictions.",
        },
        { status: 400 },
      );
    }

    const set = await createCustomSet({
      name: body.name.trim(),
      description:
        body.description?.trim() ||
        `Roster chase · ${playerGroups.length} players from catalog`,
      set_type: "curated",
      visibility,
    });

    const results: {
      player: string;
      status: "added" | "skipped";
      cardLabel?: string;
    }[] = [];
    let position = 0;

    for (const group of playerGroups) {
      if (!group.representative) {
        results.push({ player: group.playerName, status: "skipped" });
        continue;
      }

      await addCustomSetCard(set.uuid, {
        card_uuid: group.representative.uuid,
        match_mode: "any_printing",
        position,
      });
      position += 1;

      results.push({
        player: group.playerName,
        status: "added",
        cardLabel: `${cardTitle(group.representative)} — ${cardSubtitle(group.representative)}`,
      });
    }

    const added = results.filter((row) => row.status === "added").length;

    return NextResponse.json({
      set,
      mode: "roster",
      added,
      totalCards: total,
      playerCount: playerGroups.length,
      results,
    });
  } catch (error) {
    return handleError(error);
  }
}
