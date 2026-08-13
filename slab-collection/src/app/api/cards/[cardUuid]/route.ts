import { NextRequest, NextResponse } from "next/server";

import { fetchCardDetail } from "@/lib/card-detail";
import { SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cardUuid: string }> },
) {
  try {
    const { cardUuid } = await context.params;
    const gradeKey = request.nextUrl.searchParams.get("grade_key") ?? "RAW";

    if (!cardUuid?.trim()) {
      return NextResponse.json({ detail: "Card UUID is required." }, { status: 400 });
    }

    const result = await fetchCardDetail(cardUuid, gradeKey);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
