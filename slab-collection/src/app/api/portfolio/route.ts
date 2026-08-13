import { NextResponse } from "next/server";

import { buildTopSetsByValue } from "@/lib/portfolio-sets";
import {
  fetchAllCollection,
  getDashboard,
  getPortfolioHistory,
  SlabApiError,
} from "@/lib/slab/client";

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
    const [dashboard, history, copies] = await Promise.all([
      getDashboard(),
      getPortfolioHistory(90),
      fetchAllCollection(),
    ]);

    const topSetsByValue = buildTopSetsByValue(copies);

    return NextResponse.json({ dashboard, history, topSetsByValue });
  } catch (error) {
    return handleError(error);
  }
}
