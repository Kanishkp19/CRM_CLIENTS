// POST /api/entities/:id/renew
// Marks previous active cycle as "renewed" and creates new active cycle inside an atomic transaction.

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

  // Execute renewal cycle creation and status updates atomically
  const [_, newCycle] = await db.$transaction([
    db.cycle.update({ where: { id: latestCycle.id }, data: { status: "renewed" } }),
    db.cycle.create({
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
    }),
    db.entity.update({ where: { id: entityId }, data: { status: "active" } }),
  ]);

  // Send registration-style confirmation
  const templates = (typeof entity.business.messageTemplates === "string"
    ? JSON.parse(entity.business.messageTemplates)
    : entity.business.messageTemplates) as any;

  if (templates?.registration) {
    const msg = (templates.registration as string)
      .replace(/{{name}}/g, entity.name)
      .replace(/{{business}}/g, entity.business.name)
      .replace(/{{plan}}/g, newCycle.planName)
      .replace(/{{days_left}}/g, newEnd ? String(Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24))) : "")
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
  }

  const refreshed = await db.entity.findUnique({
    where: { id: entityId },
    include: {
      cycles: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });
  return NextResponse.json({ entity: serializeEntity(refreshed!) });
}
