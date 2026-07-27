// POST /api/entities/:id/send-reminder
// Manual owner override — "Send reminder now" action from the entity detail view.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeEntity } from "@/lib/serialize";
import { sendNotificationMessage } from "@/lib/messaging";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: entityId } = await params;
  const entity = await db.entity.findUnique({
    where: { id: entityId },
    include: { cycles: { orderBy: { createdAt: "desc" }, take: 1 }, business: true },
  });
  if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  const cycle = entity.cycles[0];
  if (!cycle) return NextResponse.json({ error: "No active cycle" }, { status: 400 });

  const templates = JSON.parse(entity.business.messageTemplates);
  const isExpired = entity.status === "expired" || entity.status === "lapsed";
  const triggerType = isExpired ? "post_expiry" : "pre_expiry";
  const template = isExpired ? (templates.postExpiry || templates.post_expiry) : (templates.preExpiry || templates.pre_expiry);

  const daysLeft = cycle.endDate
    ? Math.round((new Date(cycle.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const msg = (template as string || "Reminder from {{business}} for your {{plan}}")
    .replace(/{{name}}/g, entity.name)
    .replace(/{{business}}/g, entity.business.name)
    .replace(/{{plan}}/g, cycle.planName)
    .replace(/{{days_left}}/g, daysLeft != null ? String(daysLeft) : "")
    .replace(/{{units_remaining}}/g, cycle.unitsRemaining != null ? String(cycle.unitsRemaining) : "")
    .replace(/{{start_date}}/g, cycle.startDate.toISOString().slice(0, 10))
    .replace(/{{end_date}}/g, cycle.endDate ? cycle.endDate.toISOString().slice(0, 10) : "");

  const dispatchResult = await sendNotificationMessage({
    toEmail: entity.email,
    toPhone: entity.phone,
    subject: `Reminder: Your ${cycle.planName}`,
    bodyText: msg,
    businessName: entity.business.name,
    channelPrefer: "email",
  });

  const notif = await db.notificationLog.create({
    data: {
      entityId,
      cycleId: cycle.id,
      channel: dispatchResult.channel,
      triggerType,
      message: msg,
      status: dispatchResult.status,
    },
  });

  const refreshed = await db.entity.findUnique({
    where: { id: entityId },
    include: {
      cycles: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });
  return NextResponse.json({ entity: serializeEntity(refreshed!), notification: notif });
}
