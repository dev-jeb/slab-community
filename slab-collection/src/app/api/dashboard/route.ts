import { NextResponse } from "next/server";

import { getDashboard } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const dashboard = await getDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    return slabErrorResponse(error);
  }
}
