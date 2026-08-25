import { NextRequest, NextResponse } from "next/server";

import { fetchCollection, searchCollection } from "@/lib/slab/client";
import type { CollectionSearchQuery } from "@/lib/slab/types";
import { slabErrorResponse } from "@/lib/api-response";

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
    // Set membership, so an expanded set group can pull exactly its own copies.
    set_slug: params.get("set_slug") ?? undefined,
  };

  try {
    const fetchAll = params.get("all") === "true";
    const result = fetchAll
      ? await fetchCollection(query)
      : await searchCollection(query);
    return NextResponse.json(result);
  } catch (error) {
    return slabErrorResponse(error, "Failed to load collection");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CollectionSearchQuery;
    const result = await searchCollection(body);
    return NextResponse.json(result);
  } catch (error) {
    return slabErrorResponse(error, "Failed to load collection");
  }
}
