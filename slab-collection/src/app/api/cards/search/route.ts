import { NextRequest, NextResponse } from "next/server";

import { getCollectorUuid, searchCards } from "@/lib/slab/client";
import type { CardSearchQuery } from "@/lib/slab/types";
import { slabErrorResponse } from "@/lib/api-response";

/**
 * Every catalog search runs as YOU.
 *
 * Passing the collector makes the API stamp each row with `owned_quantity`, which is what lets one
 * table serve both scopes: search the whole catalog and still see, per row, whether it's already
 * yours — and filter on it (`owned`). The browser never picks the collector; it's resolved here
 * from the key, same as every collection route.
 */
async function withCollector(query: CardSearchQuery): Promise<CardSearchQuery> {
  try {
    return { collector: await getCollectorUuid(), ...query };
  } catch {
    // No collector resolvable (no key, no account yet) — the catalog is still searchable, it just
    // can't say what you own. Better than failing the whole search.
    return query;
  }
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
    const result = await searchCards(await withCollector(query));
    return NextResponse.json(result);
  } catch (error) {
    return slabErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CardSearchQuery;
    const result = await searchCards(
      await withCollector({ include_market: true, ...body }),
    );
    return NextResponse.json(result);
  } catch (error) {
    return slabErrorResponse(error);
  }
}
