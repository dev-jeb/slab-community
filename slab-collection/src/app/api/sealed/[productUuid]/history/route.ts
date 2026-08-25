import { NextResponse } from "next/server";

import { getSealedPriceHistory } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

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
    return slabErrorResponse(error);
  }
}
