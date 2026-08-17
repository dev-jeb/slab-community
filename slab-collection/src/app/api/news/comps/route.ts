import { NextResponse } from "next/server";

import { fetchOwnedCardComps, NEWS_COMP_BATCH_MAX } from "@/lib/slab-news";
import { SlabApiError } from "@/lib/slab/client";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    const status =
      error.status === 503 && !error.message.includes("SLAB_API_KEY")
        ? 504
        : error.status;
    return NextResponse.json({ detail: error.message }, { status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

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
    return handleError(error);
  }
}
