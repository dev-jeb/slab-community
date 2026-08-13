import { NextResponse } from "next/server";

import {
  subscribeToCustomSet,
  unsubscribeFromCustomSet,
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

export async function POST(
  _request: Request,
  context: { params: Promise<{ setUuid: string }> },
) {
  try {
    const { setUuid } = await context.params;
    await subscribeToCustomSet(setUuid);
    return NextResponse.json({ subscribed: true });
  } catch (error) {
    return handleError(error);
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
    return handleError(error);
  }
}
