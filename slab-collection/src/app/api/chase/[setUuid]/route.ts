import { NextResponse } from "next/server";

import { getCustomSet } from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET(
  _request: Request,
  context: { params: Promise<{ setUuid: string }> },
) {
  try {
    const { setUuid } = await context.params;

    if (!setUuid?.trim()) {
      return NextResponse.json({ detail: "Set UUID is required." }, { status: 400 });
    }

    const detail = await getCustomSet(setUuid);
    return NextResponse.json(detail);
  } catch (error) {
    return slabErrorResponse(error);
  }
}
