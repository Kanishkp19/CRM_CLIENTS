// POST /api/templates
// AI-draft message-template set for authenticated owner business.

import { NextRequest, NextResponse } from "next/server";
import { draftMessageTemplates } from "@/lib/zai";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { serializeBusiness } from "@/lib/serialize";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tone: "friendly" | "professional" | "casual" = body.tone ?? "friendly";

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {}

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const business = await db.business.findFirst({ where: { ownerUserId: userId } });

  if (!business) return NextResponse.json({ error: "No business found" }, { status: 404 });

  try {
    const drafts = await draftMessageTemplates({
      businessName: business.name,
      verticalLabel: business.verticalType,
      entityLabel: business.entityLabel,
      tone,
    });

    const merged = JSON.stringify(drafts);
    const updated = await db.business.update({
      where: { id: business.id },
      data: { messageTemplates: merged },
    });
    return NextResponse.json({ business: serializeBusiness(updated) });
  } catch (err: any) {
    const fallbackTemplates = {
      registration: `Hi {{name}}, welcome to ${business.name}! Your {{plan}} is now active.`,
      preExpiry: `Hi {{name}}, your {{plan}} at ${business.name} expires in {{days_left}} days.`,
      expiryDay: `Hi {{name}}, your {{plan}} at ${business.name} expires today.`,
      postExpiry: `Hi {{name}}, your {{plan}} at ${business.name} has lapsed. Reply to renew.`,
    };
    const updated = await db.business.update({
      where: { id: business.id },
      data: { messageTemplates: JSON.stringify(fallbackTemplates) },
    });
    return NextResponse.json({ business: serializeBusiness(updated) });
  }
}
