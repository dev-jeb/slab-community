import { NextResponse } from "next/server";

import { buildSetDetail } from "@/lib/set-detail";
import { slabErrorResponse } from "@/lib/api-response";

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
    return slabErrorResponse(error);
  }
}
