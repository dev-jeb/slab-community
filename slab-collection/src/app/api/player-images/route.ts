import { NextResponse } from "next/server";

import { fetchPlayerImageUrl } from "@/lib/player-image";

function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { names?: string[] };
    const names = [...new Set((body.names ?? []).map((name) => name.trim()).filter(Boolean))];

    if (!names.length) {
      return NextResponse.json({ images: {} });
    }

    const images: Record<string, string | null> = {};

    await Promise.all(
      names.map(async (name) => {
        try {
          images[normalizeKey(name)] = await fetchPlayerImageUrl(name);
        } catch {
          images[normalizeKey(name)] = null;
        }
      }),
    );

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: {} });
  }
}
