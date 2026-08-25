import { NextResponse } from "next/server";

import { getSealedMarket, SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

/** One SKU's market — snapshot points plus the sales behind them. Loaded with its price history. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productUuid: string }> },
) {
  try {
    const { productUuid } = await params;
    return NextResponse.json(await getSealedMarket(productUuid));
  } catch (error) {
    return handleError(error);
  }
}
