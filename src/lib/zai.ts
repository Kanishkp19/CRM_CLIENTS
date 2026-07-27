// Cycle — Optimized Gemini & AI SDK wrapper.
// Configured for maximum token efficiency and state-of-the-art Gemini Flash models.

import ZAI from "z-ai-web-dev-sdk";

export const zai = typeof (ZAI as any).getInstance === "function"
  ? (ZAI as any).getInstance({
      apiKey: process.env.ZAI_API_KEY ?? "z-ai-placeholder",
      baseUrl: process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/paas/v4",
    })
  : new (ZAI as any)({
      apiKey: process.env.ZAI_API_KEY ?? "z-ai-placeholder",
      baseUrl: process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/paas/v4",
    });

export interface ParsedEntityDraft {
  name: string;
  phone?: string;
  email?: string;
  planName: string;
  startDate: string;       // ISO yyyy-mm-dd
  endDate?: string;       // ISO yyyy-mm-dd
  unitsTotal?: number;
  amount?: number;
  customFields?: Record<string, string>;
  confidence: "high" | "medium" | "low";
}

const SYSTEM_PARSE_VOICE = `CRM parser. Convert audio/transcript into JSON object with fields: name (string), phone (digits string), email (string), planName (string), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), unitsTotal (number), amount (number), confidence ("high"|"medium"|"low"). Output valid JSON only.`;

const SYSTEM_PARSE_PHOTO = `Register OCR parser. Convert image rows to JSON array of objects with fields: name, phone, email, planName, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), unitsTotal, amount, confidence. Output JSON array only.`;

const SYSTEM_PARSE_DOC = `Document/Spreadsheet CRM parser. Extract every client/member record into a JSON array of objects with fields: name (required string), phone (digits string), email (string), planName (required string), startDate (ISO YYYY-MM-DD), endDate (ISO YYYY-MM-DD), unitsTotal (number), amount (number), confidence ("high"|"medium"|"low"). Output JSON array only.`;

const SYSTEM_DRAFT_TEMPLATE = `CRM copywriter. Write 4 short WhatsApp templates (under 20 words each) using placeholders {{name}}, {{business}}, {{plan}}, {{days_left}}, {{units_remaining}}, {{start_date}}, {{end_date}}. Output JSON object with keys: registration, preExpiry, expiryDay, postExpiry.`;

function safeExtractJson(text: string): any {
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.search(/[{[]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

async function callGemini(contents: any[], systemInstruction?: string, maxTokens = 2500): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body: any = {
        contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        lastError = new Error(data.error?.message || `Gemini ${model} error`);
        continue;
      }

      const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (candidate) return candidate;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini Flash models failed");
}

/// Voice-to-entity: transcribe audio or parse text transcript
export async function parseVoiceToEntity(
  audio: { fileBase64?: string; filePath?: string; transcript?: string; mimeType?: string },
  today = new Date()
): Promise<ParsedEntityDraft> {
  let transcript = audio.transcript ?? "";
  const todayIso = today.toISOString().slice(0, 10);

  if (process.env.GEMINI_API_KEY) {
    try {
      const parts: any[] = [];
      if (audio.fileBase64) {
        let cleanBase64 = audio.fileBase64;
        let mimeType = audio.mimeType || "audio/webm";
        if (cleanBase64.startsWith("data:")) {
          const matches = cleanBase64.match(/^data:(.*);base64,(.*)$/);
          if (matches) {
            mimeType = matches[1];
            cleanBase64 = matches[2];
          }
        }
        parts.push({
          inlineData: {
            mimeType: mimeType.split(";")[0], // clean mimeType e.g. "audio/webm"
            data: cleanBase64,
          },
        });
      }
      parts.push({ text: `Today: ${todayIso}.${transcript ? ` Text: "${transcript.trim()}"` : " Transcribe audio and extract entity fields into JSON."}` });

      const textOutput = await callGemini([{ parts }], SYSTEM_PARSE_VOICE, 2500);
      const parsed = safeExtractJson(textOutput);
      if (parsed) return parsed as ParsedEntityDraft;
    } catch (e: any) {
      console.warn("Gemini voice parse fallback:", e?.message);
    }
  }

  // Fallback ZAI call
  if (!transcript && audio.fileBase64) {
    try {
      const asr = await zai.audio.asr.create({ file_base64: audio.fileBase64 });
      transcript = typeof asr === "string" ? asr : (asr?.text ?? asr?.transcript ?? "");
    } catch {}
  }

  const userMsg = `Today is ${todayIso}. Transcript:\n"""${transcript}"""`;
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PARSE_VOICE },
        { role: "user", content: userMsg },
      ],
      temperature: 0.1,
    });

    const content = completion?.choices?.[0]?.message?.content ?? "";
    const parsed = safeExtractJson(content);
    if (parsed) return parsed as ParsedEntityDraft;
  } catch {}

  return {
    name: "New Client",
    planName: "Standard Plan",
    startDate: todayIso,
    confidence: "low",
  };
}

/// Photo-to-bulk-import: vision OCR for handwritten registers
export async function parsePhotoToEntities(imageUrlOrBase64: string): Promise<ParsedEntityDraft[]> {
  if (process.env.GEMINI_API_KEY) {
    try {
      let base64Data = imageUrlOrBase64;
      let mimeType = "image/jpeg";
      if (imageUrlOrBase64.startsWith("data:")) {
        const matches = imageUrlOrBase64.match(/^data:(.*);base64,(.*)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const textOutput = await callGemini(
        [
          {
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: "Extract rows to JSON array." },
            ],
          },
        ],
        SYSTEM_PARSE_PHOTO,
        2500
      );

      const parsed = safeExtractJson(textOutput);
      if (parsed) {
        return Array.isArray(parsed) ? (parsed as ParsedEntityDraft[]) : [parsed as ParsedEntityDraft];
      }
    } catch (e: any) {
      console.warn("Gemini vision parse fallback:", e?.message);
    }
  }

  return [];
}

/// Document/Spreadsheet/PDF-to-bulk-import
export async function parseDocToEntities(opts: {
  fileBase64?: string;
  mimeType?: string;
  textContent?: string;
  fileName?: string;
}): Promise<ParsedEntityDraft[]> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const parts: any[] = [];

      if (opts.fileBase64 && opts.mimeType) {
        let cleanBase64 = opts.fileBase64;
        if (cleanBase64.startsWith("data:")) {
          const commaIdx = cleanBase64.indexOf(",");
          if (commaIdx >= 0) cleanBase64 = cleanBase64.slice(commaIdx + 1);
        }
        parts.push({
          inlineData: {
            mimeType: opts.mimeType,
            data: cleanBase64,
          },
        });
      }

      if (opts.textContent) {
        parts.push({ text: `Document content:\n"""\n${opts.textContent}\n"""` });
      } else {
        parts.push({ text: `Extract all member/client database entries from this file (${opts.fileName || "uploaded file"}) into a JSON array.` });
      }

      const textOutput = await callGemini([{ parts }], SYSTEM_PARSE_DOC, 2500);
      const parsed = safeExtractJson(textOutput);
      if (parsed) {
        return Array.isArray(parsed) ? (parsed as ParsedEntityDraft[]) : [parsed as ParsedEntityDraft];
      }
    } catch (e: any) {
      console.warn("Gemini document parse error:", e?.message);
    }
  }

  return [];
}

/// AI-draft message templates
export async function draftMessageTemplates(opts: {
  businessName: string;
  verticalLabel: string;
  entityLabel: string;
  tone: "friendly" | "professional" | "casual";
}): Promise<{ registration: string; preExpiry: string; expiryDay: string; postExpiry: string }> {
  const userMsg = `Biz: ${opts.businessName}, Vertical: ${opts.verticalLabel}, Tone: ${opts.tone}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const textOutput = await callGemini(
        [{ parts: [{ text: userMsg }] }],
        SYSTEM_DRAFT_TEMPLATE,
        2500
      );
      const parsed = safeExtractJson(textOutput);
      if (parsed) {
        return {
          registration: parsed.registration ?? `Hi {{name}}, welcome to ${opts.businessName}! Your {{plan}} is now active.`,
          preExpiry: parsed.preExpiry ?? `Hi {{name}}, your {{plan}} at ${opts.businessName} expires in {{days_left}} days.`,
          expiryDay: parsed.expiryDay ?? `Hi {{name}}, your {{plan}} at ${opts.businessName} expires today.`,
          postExpiry: parsed.postExpiry ?? `Hi {{name}}, your {{plan}} at ${opts.businessName} has lapsed. Reply to renew.`,
        };
      }
    } catch (e: any) {
      console.warn("Gemini template drafting fallback:", e?.message);
    }
  }

  // Guaranteed fallback template set (never fails)
  return {
    registration: `Hi {{name}}, welcome to ${opts.businessName}! Your {{plan}} is now active.`,
    preExpiry: `Hi {{name}}, your {{plan}} at ${opts.businessName} expires in {{days_left}} days.`,
    expiryDay: `Hi {{name}}, your {{plan}} at ${opts.businessName} expires today.`,
    postExpiry: `Hi {{name}}, your {{plan}} at ${opts.businessName} has lapsed. Reply to renew.`,
  };
}
