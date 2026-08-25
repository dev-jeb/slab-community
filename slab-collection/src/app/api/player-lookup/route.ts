import { NextRequest, NextResponse } from "next/server";

import { lookupPlayer, type PlayerLookupRequest } from "@/lib/player-lookup";
import { slabErrorResponse } from "@/lib/api-response";

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
    return slabErrorResponse(error);
  }
}
