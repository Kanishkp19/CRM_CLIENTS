// POST /api/reminder-scan
// TRD §4 — single scheduled job, runs once daily.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeBusiness } from "@/lib/serialize";
import { sendNotificationMessage } from "@/lib/messaging";

export async function POST(_req: NextRequest) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;

  const business = await db.business.findFirst({ orderBy: { createdAt: "desc" } });
  if (!business) return NextResponse.json({ summary: { scanned: 0 } });

  const reminderConfig = JSON.parse(business.reminderConfig);
  const daysBeforeExpiry: number[] = reminderConfig.daysBeforeExpiry ?? [];
  const sessionsThreshold: number = reminderConfig.sessionsRemainingThreshold ?? 2;
  const templates = JSON.parse(business.messageTemplates);

  const entities = await db.entity.findMany({
    where: { businessId: business.id, status: { in: ["active", "expiring_soon"] } },
    include: { cycles: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const sent: { entityId: string; triggerType: string; channel: string }[] = [];
  const lapsedEntityIds: string[] = [];
  const expiringSoonEntityIds: string[] = [];

  for (const entity of entities) {
    const cycle = entity.cycles[0];
    if (!cycle) continue;

    const interpolated = (tpl: string) =>
      (tpl || "")
        .replace(/{{name}}/g, entity.name)
        .replace(/{{business}}/g, business.name)
        .replace(/{{plan}}/g, cycle.planName)
        .replace(/{{units_remaining}}/g, cycle.unitsRemaining != null ? String(cycle.unitsRemaining) : "")
        .replace(/{{start_date}}/g, cycle.startDate.toISOString().slice(0, 10))
        .replace(/{{end_date}}/g, cycle.endDate ? cycle.endDate.toISOString().slice(0, 10) : "");

    // Date-based trigger
    if (business.cycleType === "date_based" || business.cycleType === "both") {
      if (!cycle.endDate) continue;
      const end = new Date(cycle.endDate);
      end.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((end.getTime() - today.getTime()) / msPerDay);

      if (daysBeforeExpiry.includes(daysLeft) && daysLeft > 0) {
        const msg = interpolated(templates.preExpiry).replace(/{{days_left}}/g, String(daysLeft));
        const dispatch = await sendNotificationMessage({
          toEmail: entity.email,
          toPhone: entity.phone,
          subject: `Reminder: Your ${cycle.planName} expires in ${daysLeft} day(s)`,
          bodyText: msg,
          businessName: business.name,
        });

        await db.notificationLog.create({
          data: {
            entityId: entity.id,
            cycleId: cycle.id,
            channel: dispatch.channel,
            triggerType: "pre_expiry",
            message: msg,
            status: dispatch.status,
          },
        });
        sent.push({ entityId: entity.id, triggerType: "pre_expiry", channel: dispatch.channel });
        expiringSoonEntityIds.push(entity.id);
      }

      if (daysLeft === 0) {
        const msg = interpolated(templates.expiryDay);
        const dispatch = await sendNotificationMessage({
          toEmail: entity.email,
          toPhone: entity.phone,
          subject: `Notice: Your ${cycle.planName} expires today`,
          bodyText: msg,
          businessName: business.name,
        });

        await db.notificationLog.create({
          data: {
            entityId: entity.id,
            cycleId: cycle.id,
            channel: dispatch.channel,
            triggerType: "expiry_day",
            message: msg,
            status: dispatch.status,
          },
        });
        sent.push({ entityId: entity.id, triggerType: "expiry_day", channel: dispatch.channel });
      }

      if (daysLeft < 0 && daysLeft > -7) {
        await db.entity.update({ where: { id: entity.id }, data: { status: "expired" } });
      }
      if (daysLeft <= -7) {
        await db.cycle.update({ where: { id: cycle.id }, data: { status: "lapsed" } });
        await db.entity.update({ where: { id: entity.id }, data: { status: "lapsed" } });
        lapsedEntityIds.push(entity.id);
        if (reminderConfig.sendPostExpiry) {
          const msg = interpolated(templates.postExpiry);
          const dispatch = await sendNotificationMessage({
            toEmail: entity.email,
            toPhone: entity.phone,
            subject: `Notice: Your ${cycle.planName} has lapsed`,
            bodyText: msg,
            businessName: business.name,
          });

          await db.notificationLog.create({
            data: {
              entityId: entity.id,
              cycleId: cycle.id,
              channel: dispatch.channel,
              triggerType: "post_expiry",
              message: msg,
              status: dispatch.status,
            },
          });
          sent.push({ entityId: entity.id, triggerType: "post_expiry", channel: dispatch.channel });
        }
      }
    }

    // Count-based trigger
    if (business.cycleType === "count_based" || business.cycleType === "both") {
      if (cycle.unitsRemaining == null) continue;
      if (cycle.unitsRemaining === sessionsThreshold && cycle.unitsRemaining > 0) {
        const msg = interpolated(templates.preExpiry);
        const dispatch = await sendNotificationMessage({
          toEmail: entity.email,
          toPhone: entity.phone,
          subject: `Reminder: ${cycle.unitsRemaining} session(s) remaining`,
          bodyText: msg,
          businessName: business.name,
        });

        await db.notificationLog.create({
          data: {
            entityId: entity.id,
            cycleId: cycle.id,
            channel: dispatch.channel,
            triggerType: "pre_expiry",
            message: msg,
            status: dispatch.status,
          },
        });
        sent.push({ entityId: entity.id, triggerType: "pre_expiry", channel: dispatch.channel });
        expiringSoonEntityIds.push(entity.id);
      }
      if (cycle.unitsRemaining === 0) {
        const msg = interpolated(templates.expiryDay);
        const dispatch = await sendNotificationMessage({
          toEmail: entity.email,
          toPhone: entity.phone,
          subject: `Notice: All sessions used for ${cycle.planName}`,
          bodyText: msg,
          businessName: business.name,
        });

        await db.notificationLog.create({
          data: {
            entityId: entity.id,
            cycleId: cycle.id,
            channel: dispatch.channel,
            triggerType: "expiry_day",
            message: msg,
            status: dispatch.status,
          },
        });
        sent.push({ entityId: entity.id, triggerType: "expiry_day", channel: dispatch.channel });
        await db.entity.update({ where: { id: entity.id }, data: { status: "expired" } });
      }
    }
  }

  if (expiringSoonEntityIds.length) {
    await db.entity.updateMany({
      where: { id: { in: expiringSoonEntityIds }, status: "active" },
      data: { status: "expiring_soon" },
    });
  }

  return NextResponse.json({
    summary: {
      scanned: entities.length,
      sent: sent.length,
      lapsed: lapsedEntityIds.length,
      business: serializeBusiness(business),
    },
    sent,
  });
}
