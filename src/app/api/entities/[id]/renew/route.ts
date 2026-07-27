// POST /api/entities/:id/renew
// Marks the latest cycle as "renewed" and creates a new active cycle on top.
// Per PRD §6 flow 4: "owner marks a cycle as renewed → new cycle created, old cycle archived."

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeEntity } from "@/lib/serialize";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: entityId } = await params;
  const body = await req.json().catch(() => ({}));

  const entity = await db.entity.findUnique({
    where: { id: entityId },
    include: { cycles: { orderBy: { createdAt: "desc" } }, business: true },
  });
  if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  const latestCycle = entity.cycles[0];
  if (!latestCycle) return NextResponse.json({ error: "No cycle to renew" }, { status: 400 });

  await db.cycle.update({ where: { id: latestCycle.id }, data: { status: "renewed" } });

  // New cycle starts today, ends today + same duration as the previous one (or new provided values)
  const newStart = new Date(body.startDate ?? new Date());
  newStart.setHours(0, 0, 0, 0);

  let newEnd: Date | null = null;
  if (body.endDate) {
    newEnd = new Date(body.endDate);
  } else if (latestCycle.endDate) {
    const prevStart = new Date(latestCycle.startDate);
    const prevEnd = new Date(latestCycle.endDate);
    const durationDays = Math.round((prevEnd.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24));
    newEnd = new Date(newStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }
  if (newEnd) newEnd.setHours(0, 0, 0, 0);

  const newUnitsTotal = body.unitsTotal ?? latestCycle.unitsTotal;
  const newUnitsRemaining = newUnitsTotal;

  const newCycle = await db.cycle.create({
    data: {
      entityId,
      planName: body.planName ?? latestCycle.planName,
      startDate: newStart,
      endDate: newEnd,
      unitsTotal: newUnitsTotal,
      unitsRemaining: newUnitsRemaining,
      amount: body.amount ?? latestCycle.amount ?? null,
      status: "active",
    },
  });

  // Send registration-style confirmation
  const templates = JSON.parse(entity.business.messageTemplates);
  const msg = (templates.registration as string)
    .replace(/{{name}}/g, entity.name)
    .replace(/{{business}}/g, entity.business.name)
    .replace(/{{plan}}/g, newCycle.planName)
    .replace(/{{days_left}}/g, newEnd ? String(Math.round((newEnd.getTime() - newStart.getTime()) / (1000*60*60*24))) : "")
    .replace(/{{units_remaining}}/g, newUnitsRemaining != null ? String(newUnitsRemaining) : "")
    .replace(/{{start_date}}/g, newStart.toISOString().slice(0, 10))
    .replace(/{{end_date}}/g, newEnd ? newEnd.toISOString().slice(0, 10) : "");

  await db.notificationLog.create({
    data: {
      entityId,
      cycleId: newCycle.id,
      channel: "whatsapp",
      triggerType: "registration",
      message: msg,
      status: "sent",
    },
  });

  // Reset cached entity status to active
  await db.entity.update({ where: { id: entityId }, data: { status: "active" } });

  const refreshed = await db.entity.findUnique({
    where: { id: entityId },
    include: {
      cycles: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });
  return NextResponse.json({ entity: serializeEntity(refreshed!) });
}
