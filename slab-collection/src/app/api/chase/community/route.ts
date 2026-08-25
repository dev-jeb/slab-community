import { NextResponse } from "next/server";

import { getPopularCustomSets } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    // Only the popular sets are rendered here. This used to fetch the whole community board
    // and discard every other field with it.
    const sets = await getPopularCustomSets(20);
    return NextResponse.json({ sets });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
