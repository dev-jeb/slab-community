import { NextResponse } from "next/server";

import { MISSING_API_KEY_CODE, MissingApiKeyError, SlabApiError } from "@/lib/slab/errors";

/**
 * The one way an `/api/*` route turns a thrown error into a response.
 *
 * This was a `handleError` function pasted into twenty-five of the twenty-eight route files —
 * twenty-one of them byte-identical, the other four differing only in a fallback string. Beyond the
 * duplication, each copy decided "is this a missing API key?" by looking for `SLAB_API_KEY` inside
 * the message, so the browser had no reliable signal and every view guessed from the bare 503.
 *
 * Server-only: it imports `next/server`, so client components take {@link formatApiDetail} and
 * {@link isMissingApiKeyError} from `@/lib/api-errors` instead.
 */
export function slabErrorResponse(error: unknown, fallback = "Request failed") {
  if (error instanceof MissingApiKeyError) {
    return NextResponse.json(
      { detail: error.message, code: MISSING_API_KEY_CODE },
      { status: 503 },
    );
  }

  if (error instanceof SlabApiError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ detail: message }, { status: 500 });
}
