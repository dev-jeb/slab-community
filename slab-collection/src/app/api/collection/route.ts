import { NextRequest, NextResponse } from "next/server";

import { fetchCollection, searchCollection, SlabApiError } from "@/lib/slab/client";
import type { CollectionSearchQuery } from "@/lib/slab/types";

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Failed to load collection";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const query: CollectionSearchQuery = {
    q: params.get("q") ?? undefined,
    subject: params.get("subject") ?? undefined,
    sort: params.get("sort") ?? undefined,
    limit: Number(params.get("limit") ?? 48),
    offset: Number(params.get("offset") ?? 0),
    serial: params.get("serial") ? Number(params.get("serial")) : undefined,
    auto: params.get("auto") === "true" ? true : undefined,
    rookie: params.get("rookie") === "true" ? true : undefined,
    is_numbered: params.get("is_numbered") === "true" ? true : undefined,
    graded: params.get("graded") === "true" ? true : undefined,
    team: params.get("team") ?? undefined,
  };

  try {
    const fetchAll = params.get("all") === "true";
    const result = fetchAll
      ? await fetchCollection(query)
      : await searchCollection(query);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CollectionSearchQuery;
    const result = await searchCollection(body);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
