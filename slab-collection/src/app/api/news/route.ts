import { NextResponse } from "next/server";

import { buildNewsPayload } from "@/lib/slab-news";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const payload = await buildNewsPayload();
    return NextResponse.json(payload);
  } catch (error) {
    return slabErrorResponse(error);
  }
}
