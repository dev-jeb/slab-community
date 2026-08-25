import { NextResponse } from "next/server";

import { getLifecycleCurve } from "@/lib/slab/client";
import type { LifecycleUniverse } from "@/lib/slab/types";
import { slabErrorResponse } from "@/lib/api-response";

/**
 * A lifecycle benchmark, proxied so the API key never reaches the browser.
 *
 * A 404 from upstream is passed through as a 404: it means no build has run for that universe,
 * which the page reports as "not built yet" rather than as a failure. Fabricating an empty curve
 * to avoid an error state would be the one genuinely wrong answer.
 */
const UNIVERSES: LifecycleUniverse[] = ["raw_cards", "hobby_boxes"];

export async function GET(request: Request) {
  try {
    const asked = new URL(request.url).searchParams.get("universe");
    const universe = UNIVERSES.find((known) => known === asked) ?? "raw_cards";
    return NextResponse.json(await getLifecycleCurve(universe));
  } catch (error) {
    return slabErrorResponse(error);
  }
}
