import { NextResponse } from "next/server";

import { getSealedMarket } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

/** One SKU's market — snapshot points plus the sales behind them. Loaded with its price history. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productUuid: string }> },
) {
  try {
    const { productUuid } = await params;
    return NextResponse.json(await getSealedMarket(productUuid));
  } catch (error) {
    return slabErrorResponse(error);
  }
}
