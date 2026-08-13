import { NextRequest, NextResponse } from "next/server";

import { searchCards, SlabApiError } from "@/lib/slab/client";
import type { CardSearchQuery } from "@/lib/slab/types";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? undefined;
  const subject = params.get("subject") ?? undefined;
  const release = params.get("release") ?? undefined;
  const setSlug = params.get("set_slug") ?? undefined;

  const query: CardSearchQuery = {
    q,
    subject,
    include_market: true,
    limit: 24,
  };

  if (release) query.release = [release];
  if (setSlug) query.set_slug = [setSlug];

  try {
    const result = await searchCards(query);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CardSearchQuery;
    const result = await searchCards({ include_market: true, ...body });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
