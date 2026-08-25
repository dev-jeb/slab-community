import { NextResponse } from "next/server";

import { getSealedPriceHistory, SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

/** One SKU's price series, fetched when that SKU is picked rather than all of them up front. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productUuid: string }> },
) {
  try {
    const { productUuid } = await params;
    const { searchParams } = new URL(request.url);
    return NextResponse.json(
      await getSealedPriceHistory(productUuid, {
        interval: searchParams.get("interval") ?? undefined,
        start: searchParams.get("start") ?? undefined,
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
