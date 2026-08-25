import { NextResponse } from "next/server";

import { buildSetDetail } from "@/lib/set-detail";
import { SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ setUuid: string }> },
) {
  try {
    const { setUuid } = await params;
    const detail = await buildSetDetail(setUuid);
    if (!detail) {
      return NextResponse.json({ detail: "Set not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    return handleError(error);
  }
}
