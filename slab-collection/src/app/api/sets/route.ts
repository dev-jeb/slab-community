import { NextResponse } from "next/server";

import { fetchAllSets } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const sets = await fetchAllSets();
    return NextResponse.json({ sets, total: sets.length });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
