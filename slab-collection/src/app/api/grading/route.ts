import { NextRequest, NextResponse } from "next/server";

import { getCollectionGradingDesk, type GradingDeskQuery } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

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
    return slabErrorResponse(error);
  }
}
