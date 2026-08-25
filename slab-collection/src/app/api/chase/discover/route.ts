import { NextResponse } from "next/server";

import { searchCustomSets } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || undefined;

    const result = await searchCustomSets({
      q,
      sort: "-subscribers",
      limit: 50,
    });

    return NextResponse.json({
      sets: result.items,
      total: result.total,
    });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
