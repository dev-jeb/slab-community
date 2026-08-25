import { NextRequest, NextResponse } from "next/server";

import { fetchCardDetail, fetchCardGradeSlice } from "@/lib/card-detail";
import { slabErrorResponse } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cardUuid: string }> },
) {
  try {
    const { cardUuid } = await context.params;
    const gradeKey = request.nextUrl.searchParams.get("grade_key") ?? "RAW";

    if (!cardUuid?.trim()) {
      return NextResponse.json({ detail: "Card UUID is required." }, { status: 400 });
    }

    // slice=grade: just the grade-dependent parts, for the page's grade selector.
    if (request.nextUrl.searchParams.get("slice") === "grade") {
      const slice = await fetchCardGradeSlice(cardUuid, gradeKey);
      return NextResponse.json(slice);
    }

    const result = await fetchCardDetail(cardUuid, gradeKey);
    return NextResponse.json(result);
  } catch (error) {
    return slabErrorResponse(error);
  }
}
