import { NextResponse } from "next/server";

import { getAccount, SlabApiError } from "@/lib/slab/client";

export async function GET() {
  try {
    const account = await getAccount();
    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof SlabApiError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to load account";
    const status = message.includes("SLAB_API_KEY") ? 503 : 500;
    return NextResponse.json({ detail: message }, { status });
  }
}
