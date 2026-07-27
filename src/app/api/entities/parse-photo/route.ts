// POST /api/entities/parse-photo
// Accepts { imageDataUrl } or { imageUrl } or { fileBase64 }.
// Returns ParsedEntityDraft[] — one per detected row in the register photo.

import { NextRequest, NextResponse } from "next/server";
import { parsePhotoToEntities } from "@/lib/zai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const imageDataUrl: string | undefined = body.imageDataUrl || body.imageUrl || body.fileBase64;

  if (!imageDataUrl) {
    return NextResponse.json({ error: "Image data (imageDataUrl or imageUrl) is required" }, { status: 400 });
  }

  try {
    const drafts = await parsePhotoToEntities(imageDataUrl);
    return NextResponse.json({ drafts });
  } catch (err: any) {
    return NextResponse.json(
      {
        drafts: [],
        error: err?.message ?? "Photo parsing failed",
      },
      { status: 200 },
    );
  }
}
