// POST /api/cycles/:id/decrement
// Count-based cycle: consume one session (e.g. salon client visits).
// Auto-triggers pre_expiry reminder if remaining hits the threshold.

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

  const updated = await db.cycle.update({
    where: { id: cycleId },
    data: {
      unitsRemaining: { decrement: 1 },
      status: cycle.unitsRemaining - 1 === 0 ? "completed" : cycle.status,
    },
  });

  // Re-derive entity status
  const business = cycle.entity.business;
  const reminderConfig = JSON.parse(business.reminderConfig);
  const sessionsThreshold: number = reminderConfig.sessionsRemainingThreshold ?? 2;

  // Trigger pre_expiry reminder if we just crossed the threshold
  if (updated.unitsRemaining === sessionsThreshold || updated.unitsRemaining === 0) {
    const templates = JSON.parse(business.messageTemplates);
    const triggerType = updated.unitsRemaining === 0 ? "expiry_day" : "pre_expiry";
    const template = triggerType === "expiry_day" ? templates.expiryDay : templates.preExpiry;

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

  // Refresh entity status
  const fresh = await db.cycle.findUnique({ where: { id: cycleId } });
  const remaining = fresh?.unitsRemaining ?? 0;
  const newStatus = remaining === 0 ? "expired" : remaining <= sessionsThreshold ? "expiring_soon" : "active";
  await db.entity.update({ where: { id: cycle.entity.id }, data: { status: newStatus } });

  return NextResponse.json({ cycle: serializeCycle(updated) });
}
