import { NextRequest, NextResponse } from "next/server";

import { lookupPlayer, type PlayerLookupRequest } from "@/lib/player-lookup";
import { SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PlayerLookupRequest;

    if (!body.subject?.trim()) {
      return NextResponse.json(
        { detail: "Player name is required." },
        { status: 400 },
      );
    }

    const result = await lookupPlayer(body);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
