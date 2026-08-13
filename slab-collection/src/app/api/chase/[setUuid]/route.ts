import { NextResponse } from "next/server";

import { getCustomSet, SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ setUuid: string }> },
) {
  try {
    const { setUuid } = await context.params;

    if (!setUuid?.trim()) {
      return NextResponse.json({ detail: "Set UUID is required." }, { status: 400 });
    }

    const detail = await getCustomSet(setUuid);
    return NextResponse.json(detail);
  } catch (error) {
    return handleError(error);
  }
}
