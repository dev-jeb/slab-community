import { NextResponse } from "next/server";

import { buildTopSetsByValue } from "@/lib/portfolio-sets";
import {
  fetchAllCollection,
  getDashboard,
  getPortfolioHistory,
} from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const [dashboard, history, copies] = await Promise.all([
      getDashboard(),
      getPortfolioHistory(90),
      fetchAllCollection(),
    ]);

    const topSetsByValue = buildTopSetsByValue(copies);

    return NextResponse.json({ dashboard, history, topSetsByValue });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
