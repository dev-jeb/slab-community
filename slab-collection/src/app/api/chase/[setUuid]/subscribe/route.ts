import { NextResponse } from "next/server";

import {
  subscribeToCustomSet,
  unsubscribeFromCustomSet,
} from "@/lib/slab/client";
import { slabErrorResponse } from "@/lib/api-response";

export async function POST(
  _request: Request,
  context: { params: Promise<{ setUuid: string }> },
) {
  try {
    const { setUuid } = await context.params;
    await subscribeToCustomSet(setUuid);
    return NextResponse.json({ subscribed: true });
  } catch (error) {
    return slabErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ setUuid: string }> },
) {
  try {
    const { setUuid } = await context.params;
    await unsubscribeFromCustomSet(setUuid);
    return NextResponse.json({ subscribed: false });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
