// POST /api/entities/parse-photo
// Accepts { imageDataUrl } (data URL or external URL).
// Returns ParsedEntityDraft[] — one per detected row in the register photo.
// Owner reviews/excludes via bulk-confirm UI before any are written.

import { NextRequest, NextResponse } from "next/server";
import { parsePhotoToEntities } from "@/lib/zai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const imageDataUrl: string | undefined = body.imageDataUrl;

  if (!imageDataUrl) {
    return NextResponse.json({ error: "imageDataUrl is required" }, { status: 400 });
  }

  try {
    const drafts = await parsePhotoToEntities(imageDataUrl);
    return NextResponse.json({ drafts });
  } catch (err: any) {
    // Graceful fallback per implementation-plan §Phase 2: never silently drop data.
    return NextResponse.json(
      {
        drafts: [],
        error: err?.message ?? "Photo parsing failed",
      },
      { status: 200 },
    );
  }
}
