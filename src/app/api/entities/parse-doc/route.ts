// POST /api/entities/parse-doc
// Accepts { fileBase64, fileName, mimeType, textContent }
// Parses PDF, Excel, Word, CSV, or Text files using Gemini 2.5 Flash multimodal document parsing.
// Returns { drafts: ParsedEntityDraft[] } for owner review before saving.

import { NextRequest, NextResponse } from "next/server";
import { parseDocToEntities } from "@/lib/zai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fileBase64, fileName, mimeType, textContent } = body;

    if (!fileBase64 && !textContent) {
      return NextResponse.json({ error: "Missing document file or text content" }, { status: 400 });
    }

    const drafts = await parseDocToEntities({
      fileBase64,
      fileName: fileName || "uploaded_file",
      mimeType: mimeType || "application/pdf",
      textContent,
    });

    return NextResponse.json({ drafts });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Document parsing failed", drafts: [] },
      { status: 500 }
    );
  }
}
