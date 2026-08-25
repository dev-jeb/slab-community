import { NextResponse } from "next/server";

import { fetchOwnedCardComps, NEWS_COMP_BATCH_MAX } from "@/lib/slab-news";
import { slabErrorResponse } from "@/lib/api-response";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cardUuids?: unknown };
    const raw = Array.isArray(body.cardUuids) ? body.cardUuids : [];
    const cardUuids = raw
      .filter((value): value is string => typeof value === "string")
      .filter((value) => UUID_RE.test(value))
      .slice(0, NEWS_COMP_BATCH_MAX);

    const comps = await fetchOwnedCardComps(cardUuids);
    return NextResponse.json({ comps });
  } catch (error) {
    return slabErrorResponse(error);
  }
}
