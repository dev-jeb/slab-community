import { NextResponse } from "next/server";

import { searchCustomSets, SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || undefined;

    const result = await searchCustomSets({
      q,
      sort: "-subscribers",
      limit: 50,
    });

    return NextResponse.json({
      sets: result.items,
      total: result.total,
    });
  } catch (error) {
    return handleError(error);
  }
}
