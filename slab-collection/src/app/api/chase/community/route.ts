import { NextResponse } from "next/server";

import { getPopularCustomSets, SlabApiError } from "@/lib/slab/client";

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
    // Only the popular sets are rendered here. This used to fetch the whole community board
    // and discard every other field with it.
    const sets = await getPopularCustomSets(20);
    return NextResponse.json({ sets });
  } catch (error) {
    return handleError(error);
  }
}
