import { NextRequest, NextResponse } from "next/server";

import { getGradingDesk, type GradingDeskQuery } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

/** Pull the optional fee/company overrides out of the query string, rejecting garbage fees
 *  loudly rather than silently pricing the desk off the default. */
function parseDeskQuery(request: NextRequest): GradingDeskQuery | NextResponse {
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
  return query;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cardUuid: string }> },
) {
  try {
    const { cardUuid } = await context.params;
    if (!cardUuid?.trim()) {
      return NextResponse.json({ detail: "Card UUID is required." }, { status: 400 });
    }
    const query = parseDeskQuery(request);
    if (query instanceof NextResponse) return query;
    return NextResponse.json(await getGradingDesk(cardUuid, query));
  } catch (error) {
    return slabErrorResponse(error);
  }
}
