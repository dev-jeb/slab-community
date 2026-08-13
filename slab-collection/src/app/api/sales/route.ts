import { NextResponse } from "next/server";

import { buildSalesPayload } from "@/lib/sales";
import { fetchCollection, SlabApiError } from "@/lib/slab/client";

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
    const [forSale, sold] = await Promise.all([
      fetchCollection({ status: ["for_sale"] }),
      fetchCollection({ status: ["sold"] }),
    ]);

    return NextResponse.json(buildSalesPayload(forSale, sold));
  } catch (error) {
    return handleError(error);
  }
}
