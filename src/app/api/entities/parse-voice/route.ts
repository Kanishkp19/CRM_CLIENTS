// POST /api/entities/parse-voice
// Accepts { fileBase64, mimeType } or { transcript }.
// Returns a single ParsedEntityDraft for owner review before saving.

import { NextRequest, NextResponse } from "next/server";
import { parseVoiceToEntity } from "@/lib/zai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  let fileBase64: string | undefined = body.fileBase64;
  let mimeType: string | undefined = body.mimeType;

  if (fileBase64 && fileBase64.startsWith("data:")) {
    const matches = fileBase64.match(/^data:(.*);base64,(.*)$/);
    if (matches) {
      mimeType = matches[1];
      fileBase64 = matches[2];
    }
  }

  try {
    const draft = await parseVoiceToEntity({
      fileBase64,
      mimeType,
      transcript: body.transcript,
    });
    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json(
      {
        draft: {
          name: "New Member",
          planName: "Standard Plan",
          startDate: new Date().toISOString().slice(0, 10),
          confidence: "low",
          error: err?.message ?? "Voice parsing failed",
        },
      },
      { status: 200 },
    );
  }
}
