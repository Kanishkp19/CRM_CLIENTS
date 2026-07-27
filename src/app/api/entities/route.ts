// GET  /api/entities?status=&search=&sort=
// POST /api/entities  -> create entity + initial cycle (manual or AI-parsed payload)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { serializeEntity } from "@/lib/serialize";
import { deriveEntityStatus, getVerticalTemplate } from "@/lib/verticals";
import { sendNotificationMessage } from "@/lib/messaging";
import type { EntityStatus } from "@/lib/types";

async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function getBusinessForRequest() {
  const userId = await getAuthUserId();
  if (!userId) return null;
  return await db.business.findFirst({ where: { ownerUserId: userId } });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";
  const sort = url.searchParams.get("sort") || "expiry-soon";

  const business = await getBusinessForRequest();
  if (!business) return NextResponse.json({ entities: [] });

  const reminderConfig = (typeof business.reminderConfig === "string"
    ? JSON.parse(business.reminderConfig)
    : business.reminderConfig) as {
    daysBeforeExpiry: number[];
    sessionsRemainingThreshold: number;
    sendPostExpiry: boolean;
  };

  const where: any = { businessId: business.id };
  if (search) where.name = { contains: search };
  if (status) where.status = status as EntityStatus;

  let orderBy: any = { createdAt: "desc" };
  if (sort === "name") orderBy = { name: "asc" };

  const entities = await db.entity.findMany({
    where,
    orderBy,
    include: {
      cycles: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });

  const serialized = entities.map(serializeEntity);
  const enriched = serialized.map((e) => {
    const latestCycle = e.cycles[0];
    const status = deriveEntityStatus({
      cycleType: business.cycleType as any,
      endDate: latestCycle?.endDate ? new Date(latestCycle.endDate) : null,
      unitsRemaining: latestCycle?.unitsRemaining ?? null,
      reminderConfig,
    });
    return { ...e, status, latestCycle };
  });

  const filtered = status ? enriched.filter((e) => e.status === status) : enriched;

  if (sort === "expiry-soon") {
    filtered.sort((a, b) => {
      const aDays = daysLeftForEntity(a);
      const bDays = daysLeftForEntity(b);
      return aDays - bDays;
    });
  }

  return NextResponse.json({ entities: filtered });
}

function daysLeftForEntity(e: any): number {
  if (!e.latestCycle) return Number.MAX_SAFE_INTEGER;
  if (e.latestCycle.endDate) {
    const end = new Date(e.latestCycle.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (e.latestCycle.unitsRemaining != null) {
    return e.latestCycle.unitsRemaining;
  }
  return Number.MAX_SAFE_INTEGER;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let business = await getBusinessForRequest();

  // Auto-provision a default business profile if the user hasn't completed onboarding yet
  if (!business) {
    const userId = await getAuthUserId();
    if (userId) {
      const tpl = getVerticalTemplate("gym")!;
      business = await db.business.create({
        data: {
          ownerUserId: userId,
          ownerName: "Business Owner",
          name: "My Business",
          verticalType: tpl.verticalType,
          entityLabel: tpl.entityLabel,
          cycleType: tpl.cycleType,
          customFieldSchema: tpl.customFieldSchema as any,
          reminderConfig: tpl.reminderConfig as any,
          messageTemplates: tpl.messageTemplates as any,
          tier: "free",
        },
      });
    }
  }

  if (!business) return NextResponse.json({ error: "No business found — onboard first" }, { status: 400 });

  const {
    name, phone, email, customFields,
    cycle,
  } = body as {
    name: string;
    phone: string;
    email?: string;
    customFields?: Record<string, string>;
    cycle?: {
      planName: string;
      startDate: string;
      endDate?: string;
      unitsTotal?: number;
      amount?: number;
    };
  };

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  if (!cycle || !cycle.planName || !cycle.startDate) {
    return NextResponse.json({ error: "cycle.planName and cycle.startDate are required" }, { status: 400 });
  }

  const start = new Date(cycle.startDate);
  start.setHours(0, 0, 0, 0);

  const end = cycle.endDate ? new Date(cycle.endDate) : null;
  if (end) end.setHours(0, 0, 0, 0);

  const unitsTotal = cycle.unitsTotal ?? null;
  const unitsRemaining = unitsTotal;

  const reminderConfig = (typeof business.reminderConfig === "string"
    ? JSON.parse(business.reminderConfig)
    : business.reminderConfig) as any;

  const derivedInitialStatus = deriveEntityStatus({
    cycleType: business.cycleType as any,
    endDate: end,
    unitsRemaining,
    reminderConfig,
  });

  const created = await db.entity.create({
    data: {
      businessId: business.id,
      name,
      phone,
      email: email ?? null,
      customFields: (customFields ?? {}) as any,
      status: derivedInitialStatus,
      cycles: {
        create: {
          planName: cycle.planName,
          startDate: start,
          endDate: end,
          unitsTotal,
          unitsRemaining,
          amount: cycle.amount ?? null,
          status: "active",
        },
      },
    },
    include: {
      cycles: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });

  const templates = (typeof business.messageTemplates === "string"
    ? JSON.parse(business.messageTemplates)
    : business.messageTemplates) as any;

  const msg = (templates?.registration as string || "Welcome to {{business}}!")
    .replace(/{{name}}/g, name)
    .replace(/{{business}}/g, business.name)
    .replace(/{{plan}}/g, cycle.planName)
    .replace(/{{days_left}}/g, end ? String(daysBetween(start, end)) : "")
    .replace(/{{units_remaining}}/g, unitsRemaining != null ? String(unitsRemaining) : "")
    .replace(/{{start_date}}/g, cycle.startDate)
    .replace(/{{end_date}}/g, cycle.endDate ?? "");

  const dispatch = await sendNotificationMessage({
    toEmail: email,
    toPhone: phone,
    subject: `Welcome to ${business.name}`,
    bodyText: msg,
    businessName: business.name,
  });

  await db.notificationLog.create({
    data: {
      entityId: created.id,
      cycleId: created.cycles[0].id,
      channel: dispatch.channel,
      triggerType: "registration",
      message: msg,
      status: dispatch.status,
    },
  });

  const refreshed = await db.entity.findUnique({
    where: { id: created.id },
    include: {
      cycles: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });
  return NextResponse.json({ entity: serializeEntity(refreshed!) });
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
