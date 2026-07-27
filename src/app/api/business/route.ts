// GET  /api/business  -> current business (authenticated user or fallback)
// POST /api/business  -> create business with vertical template applied (onboarding flow)
// PATCH /api/business -> update reminder config / message templates / tier

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getVerticalTemplate, type ReminderConfig, type MessageTemplates } from "@/lib/verticals";
import { serializeBusiness } from "@/lib/serialize";
import type { CycleType, Tier } from "@/lib/types";

async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const userId = await getAuthUserId();

    let business = userId
      ? await db.business.findFirst({ where: { ownerUserId: userId } })
      : await db.business.findFirst({ orderBy: { createdAt: "desc" } });

    if (!business) return NextResponse.json({ business: null });
    return NextResponse.json({ business: serializeBusiness(business) });
  } catch (err: any) {
    console.warn("GET /api/business warning:", err?.message);
    return NextResponse.json({ business: null });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { ownerName, name, verticalType } = body as {
    ownerName?: string;
    name?: string;
    verticalType?: string;
  };

  if (!name || !verticalType || !ownerName) {
    return NextResponse.json(
      { error: "ownerName, name, and verticalType are required" },
      { status: 400 },
    );
  }

  const userId = (await getAuthUserId()) || "demo-user";

  const template = getVerticalTemplate(verticalType);
  if (!template) {
    return NextResponse.json({ error: `Unknown vertical: ${verticalType}` }, { status: 400 });
  }

  try {
    const business = await db.business.create({
      data: {
        ownerUserId: userId,
        ownerName,
        name,
        verticalType: template.verticalType,
        entityLabel: template.entityLabel,
        cycleType: template.cycleType as CycleType,
        customFieldSchema: JSON.stringify(template.customFieldSchema),
        reminderConfig: JSON.stringify(template.reminderConfig),
        messageTemplates: JSON.stringify(template.messageTemplates),
        tier: "free",
      },
    });

    return NextResponse.json({ business: serializeBusiness(business) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to create business profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = await getAuthUserId();

  try {
    const business = userId
      ? await db.business.findFirst({ where: { ownerUserId: userId } })
      : await db.business.findFirst({ orderBy: { createdAt: "desc" } });

    if (!business) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const patch: Record<string, any> = {};
    if (body.reminderConfig) patch.reminderConfig = JSON.stringify(body.reminderConfig as ReminderConfig);
    if (body.messageTemplates) patch.messageTemplates = JSON.stringify(body.messageTemplates as MessageTemplates);
    if (body.tier && ["free", "starter", "growth", "custom"].includes(body.tier)) {
      patch.tier = body.tier as Tier;
    }
    if (body.name) patch.name = body.name;

    const updated = await db.business.update({ where: { id: business.id }, data: patch });
    return NextResponse.json({ business: serializeBusiness(updated) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to update business profile" }, { status: 500 });
  }
}
