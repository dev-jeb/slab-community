import { NextResponse } from "next/server";

import { listCollectorCustomSets, SlabApiError } from "@/lib/slab/client";

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
    const sets = await listCollectorCustomSets();
    return NextResponse.json({ sets });
  } catch (error) {
    return handleError(error);
  }
}
