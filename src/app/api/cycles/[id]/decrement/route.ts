// POST /api/cycles/:id/decrement
// Count-based cycle: consume one session atomically and keep entity status in sync.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeCycle } from "@/lib/serialize";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: cycleId } = await params;
  const cycle = await db.cycle.findUnique({
    where: { id: cycleId },
    include: { entity: { include: { business: true } } },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  if (cycle.unitsRemaining == null) {
    return NextResponse.json({ error: "Cycle is not count-based" }, { status: 400 });
  }
  if (cycle.unitsRemaining <= 0) {
    return NextResponse.json({ error: "No sessions remaining" }, { status: 400 });
  }

  const business = cycle.entity.business;
  const reminderConfig = (typeof business.reminderConfig === "string"
    ? JSON.parse(business.reminderConfig)
    : business.reminderConfig) as any;
  const sessionsThreshold: number = reminderConfig?.sessionsRemainingThreshold ?? 2;

  const remainingAfter = cycle.unitsRemaining - 1;
  const newCycleStatus = remainingAfter === 0 ? "completed" : cycle.status;
  const newEntityStatus = remainingAfter === 0 ? "expired" : remainingAfter <= sessionsThreshold ? "expiring_soon" : "active";

  // Transactional update: update cycle and entity in the same atomic database transaction
  const [updated] = await db.$transaction([
    db.cycle.update({
      where: { id: cycleId },
      data: {
        unitsRemaining: { decrement: 1 },
        status: newCycleStatus,
      },
    }),
    db.entity.update({
      where: { id: cycle.entity.id },
      data: { status: newEntityStatus },
    }),
  ]);

  // Trigger pre_expiry reminder if we just crossed the threshold
  if (updated.unitsRemaining === sessionsThreshold || updated.unitsRemaining === 0) {
    const templates = (typeof business.messageTemplates === "string"
      ? JSON.parse(business.messageTemplates)
      : business.messageTemplates) as any;
    const triggerType = updated.unitsRemaining === 0 ? "expiry_day" : "pre_expiry";
    const template = triggerType === "expiry_day" ? templates?.expiryDay : templates?.preExpiry;

    if (template) {
      const msg = (template as string)
        .replace(/{{name}}/g, cycle.entity.name)
        .replace(/{{business}}/g, business.name)
        .replace(/{{plan}}/g, cycle.planName)
        .replace(/{{days_left}}/g, "")
        .replace(/{{units_remaining}}/g, String(updated.unitsRemaining))
        .replace(/{{start_date}}/g, cycle.startDate.toISOString().slice(0, 10))
        .replace(/{{end_date}}/g, cycle.endDate ? cycle.endDate.toISOString().slice(0, 10) : "");

      await db.notificationLog.create({
        data: {
          entityId: cycle.entity.id,
          cycleId: cycle.id,
          channel: "whatsapp",
          triggerType,
          message: msg,
          status: "sent",
        },
      });
    }
  }

  return NextResponse.json({ cycle: serializeCycle(updated) });
}
