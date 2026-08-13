import { NextRequest, NextResponse } from "next/server";

import {
  listCollectionGroups,
  SlabApiError,
  type CollectionGroupKind,
  type CollectionGroupQuery,
} from "@/lib/slab/client";

// The three grouped views share one handler because they share one request shape — only the path
// segment differs. `kind` comes from the URL, so it's validated against the allowed set rather
// than forwarded: an unchecked segment would let a caller aim this at any collection sub-path.
const KINDS: CollectionGroupKind[] = ["sets", "duplicates", "teams"];

function handleError(error: unknown) {
  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Failed to load groups";
  const status = message.includes("SLAB_API_KEY") ? 503 : 500;
  return NextResponse.json({ detail: message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;

  if (!KINDS.includes(kind as CollectionGroupKind)) {
    return NextResponse.json({ detail: `Unknown group kind: ${kind}` }, { status: 404 });
  }

  try {
    const body = (await request.json()) as CollectionGroupQuery;
    const result = await listCollectionGroups(kind as CollectionGroupKind, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
