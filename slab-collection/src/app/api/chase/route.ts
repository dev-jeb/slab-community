import { NextResponse } from "next/server";

import { listCollectorCustomSets } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const sets = await listCollectorCustomSets();
    return NextResponse.json({ sets });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
