import { NextRequest, NextResponse } from "next/server";

import { updateCopy } from "@/lib/slab/client";
import type { CardCopyUpdate } from "@/lib/slab/types";
import { slabErrorResponse } from "@/lib/api-response";

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
    return slabErrorResponse(error);
  }
}
