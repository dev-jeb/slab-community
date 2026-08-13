import { NextResponse } from "next/server";

import { getCommunityBoard, SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET() {
  try {
    const board = await getCommunityBoard(20);
    return NextResponse.json({ sets: board.popular_sets ?? [] });
  } catch (error) {
    return handleError(error);
  }
}
