import { NextRequest, NextResponse } from "next/server";

import { getCollectionGradingDesk, SlabApiError, type GradingDeskQuery } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const query: GradingDeskQuery = {};
    const fee = request.nextUrl.searchParams.get("fee");
    if (fee !== null && fee !== "") {
      const parsed = Number(fee);
      if (Number.isNaN(parsed) || parsed < 0) {
        return NextResponse.json({ detail: "fee must be a non-negative number" }, { status: 400 });
      }
      query.fee = parsed;
    }
    const company = request.nextUrl.searchParams.get("company");
    if (company) query.company = company;
    return NextResponse.json(await getCollectionGradingDesk(query));
  } catch (error) {
    return handleError(error);
  }
}
