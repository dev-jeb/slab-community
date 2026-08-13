import { NextRequest, NextResponse } from "next/server";

import { SlabApiError, updateCopy } from "@/lib/slab/client";
import type { CardCopyUpdate } from "@/lib/slab/types";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ copyUuid: string }> },
) {
  try {
    const { copyUuid } = await context.params;
    const body = (await request.json()) as CardCopyUpdate;

    if (!copyUuid?.trim()) {
      return NextResponse.json({ detail: "Copy UUID is required." }, { status: 400 });
    }

    const result = await updateCopy(copyUuid, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
