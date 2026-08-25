import { NextResponse } from "next/server";

import { buildSalesPayload } from "@/lib/sales";
import { fetchCollection } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const [forSale, sold] = await Promise.all([
      fetchCollection({ status: ["for_sale"] }),
      fetchCollection({ status: ["sold"] }),
    ]);

    return NextResponse.json(buildSalesPayload(forSale, sold));
  } catch (error) {
    return slabErrorResponse(error);
  }
}
