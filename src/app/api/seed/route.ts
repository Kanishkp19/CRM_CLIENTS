// POST /api/seed
// Idempotent: seeds a demo gym business with realistic sample members if no business exists yet.
// Lets the dashboard feel alive without forcing the user through onboarding first.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerticalTemplate, deriveEntityStatus } from "@/lib/verticals";
import { serializeBusiness } from "@/lib/serialize";

export async function POST() {
  const existing = await db.business.findFirst({ orderBy: { createdAt: "desc" } });
  if (existing) return NextResponse.json({ business: serializeBusiness(existing), seeded: false });

  const template = getVerticalTemplate("gym");

  const business = await db.business.create({
    data: {
      ownerUserId: "demo-user",
      ownerName: "Demo Owner",
      name: "Pulse Fitness Studio",
      verticalType: template.verticalType,
      entityLabel: template.entityLabel,
      cycleType: template.cycleType,
      customFieldSchema: JSON.stringify(template.customFieldSchema),
      reminderConfig: JSON.stringify(template.reminderConfig),
      messageTemplates: JSON.stringify(template.messageTemplates),
      tier: "growth",
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  type Sample = {
    name: string; phone: string; membershipType: string; goal: string;
    planName: string; startOffset: number; endOffset: number; amount: number;
  };

  const samples: Sample[] = [
    { name: "Ramesh Kumar", phone: "+919876543210", membershipType: "Quarterly", goal: "Weight loss", planName: "3-month membership", startOffset: -80, endOffset: 10, amount: 4500 },
    { name: "Priya Sharma", phone: "+919812345678", membershipType: "Monthly", goal: "Strength training", planName: "1-month membership", startOffset: -25, endOffset: 5, amount: 1500 },
    { name: "Arjun Mehta", phone: "+919812345679", membershipType: "Annual", goal: "General fitness", planName: "12-month membership", startOffset: -180, endOffset: 185, amount: 12000 },
    { name: "Sneha Reddy", phone: "+919812345680", membershipType: "Quarterly", goal: "Marathon prep", planName: "3-month membership", startOffset: -88, endOffset: 2, amount: 4500 },
    { name: "Vikram Iyer", phone: "+919812345681", membershipType: "Monthly", goal: "Muscle gain", planName: "1-month membership", startOffset: -32, endOffset: -2, amount: 1500 },
    { name: "Ananya Nair", phone: "+919812345682", membershipType: "Quarterly", goal: "Postnatal fitness", planName: "3-month membership", startOffset: -10, endOffset: 80, amount: 4500 },
    { name: "Karthik Rao", phone: "+919812345683", membershipType: "Annual", goal: "Powerlifting", planName: "12-month membership", startOffset: -350, endOffset: 15, amount: 12000 },
    { name: "Deepa Joshi", phone: "+919812345684", membershipType: "Monthly", goal: "Yoga & cardio", planName: "1-month membership", startOffset: -15, endOffset: -10, amount: 1500 },
  ];

  for (const s of samples) {
    const start = days(s.startOffset);
    const end = days(s.endOffset);
    const status = deriveEntityStatus({
      cycleType: "date_based",
      endDate: end,
      unitsRemaining: null,
      reminderConfig: template.reminderConfig,
      today,
    });

    const cycle = await db.cycle.create({
      data: {
        planName: s.planName,
        startDate: start,
        endDate: end,
        unitsTotal: null,
        unitsRemaining: null,
        amount: s.amount,
        status: "active",
        entity: {
          create: {
            businessId: business.id,
            name: s.name,
            phone: s.phone,
            email: null,
            customFields: JSON.stringify({ membershipType: s.membershipType, goal: s.goal }),
            status,
          },
        },
      },
    });

    // Backfill a few notifications per entity so the activity-log panel has content
    await db.notificationLog.create({
      data: {
        entityId: cycle.entityId,
        cycleId: cycle.id,
        channel: "whatsapp",
        triggerType: "registration",
        message: template.messageTemplates.registration
          .replace(/{{name}}/g, s.name)
          .replace(/{{business}}/g, business.name)
          .replace(/{{plan}}/g, s.planName)
          .replace(/{{start_date}}/g, iso(start))
          .replace(/{{end_date}}/g, iso(end)),
        status: "sent",
        sentAt: start,
      },
    });

    if (status === "expiring_soon" || status === "expired" || status === "lapsed") {
      await db.notificationLog.create({
        data: {
          entityId: cycle.entityId,
          cycleId: cycle.id,
          channel: "whatsapp",
          triggerType: status === "lapsed" ? "post_expiry" : "pre_expiry",
          message: (status === "lapsed" ? template.messageTemplates.postExpiry : template.messageTemplates.preExpiry)
            .replace(/{{name}}/g, s.name)
            .replace(/{{business}}/g, business.name)
            .replace(/{{plan}}/g, s.planName)
            .replace(/{{days_left}}/g, String(Math.max(0, s.endOffset))),
          status: "sent",
          sentAt: today,
        },
      });
    }
  }

  return NextResponse.json({ business: serializeBusiness(business), seeded: true });
}
