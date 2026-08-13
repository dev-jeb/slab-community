import { NextRequest, NextResponse } from "next/server";

import { fetchPlayerImageUrl } from "@/lib/player-image";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name?.trim()) {
    return NextResponse.json({ url: null });
  }

  try {
    const url = await fetchPlayerImageUrl(name.trim());
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
