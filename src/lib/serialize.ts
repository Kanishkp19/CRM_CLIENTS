// Tiny helper to serialize Prisma rows into JSON-safe DTOs.
// SQLite stores our JSON fields as TEXT — we parse them here.

import type {
  BusinessDTO,
  CycleDTO,
  EntityDTO,
  NotificationLogDTO,
} from "@/lib/types";

type PrismaBusiness = {
  id: string;
  ownerUserId?: string;
  ownerName: string;
  name: string;
  verticalType: string;
  entityLabel: string;
  cycleType: string;
  customFieldSchema: string;
  reminderConfig: string;
  messageTemplates: string;
  tier: string;
  createdAt: Date;
};

type PrismaEntity = {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string | null;
  customFields: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  cycles?: PrismaCycle[];
  notifications?: PrismaNotification[];
};

type PrismaCycle = {
  id: string;
  entityId: string;
  planName: string;
  startDate: Date;
  endDate: Date | null;
  unitsTotal: number | null;
  unitsRemaining: number | null;
  status: string;
  amount: number | null;
  createdAt: Date;
};

type PrismaNotification = {
  id: string;
  entityId: string;
  cycleId: string | null;
  channel: string;
  triggerType: string;
  message: string;
  sentAt: Date;
  status: string;
};

export function serializeBusiness(b: PrismaBusiness): BusinessDTO {
  return {
    id: b.id,
    ownerName: b.ownerName,
    name: b.name,
    verticalType: b.verticalType,
    entityLabel: b.entityLabel,
    cycleType: b.cycleType as BusinessDTO["cycleType"],
    customFieldSchema: safeParseArr(b.customFieldSchema),
    reminderConfig: safeParseObj(b.reminderConfig),
    messageTemplates: safeParseObj(b.messageTemplates),
    tier: b.tier as BusinessDTO["tier"],
    createdAt: b.createdAt.toISOString(),
  };
}

export function serializeCycle(c: PrismaCycle): CycleDTO {
  return {
    id: c.id,
    entityId: c.entityId,
    planName: c.planName,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate ? c.endDate.toISOString() : null,
    unitsTotal: c.unitsTotal,
    unitsRemaining: c.unitsRemaining,
    status: c.status as CycleDTO["status"],
    amount: c.amount,
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeNotification(n: PrismaNotification): NotificationLogDTO {
  return {
    id: n.id,
    entityId: n.entityId,
    cycleId: n.cycleId,
    channel: n.channel as NotificationLogDTO["channel"],
    triggerType: n.triggerType,
    message: n.message,
    sentAt: n.sentAt.toISOString(),
    status: n.status as "sent" | "failed",
  };
}

export function serializeEntity(e: PrismaEntity): EntityDTO {
  return {
    id: e.id,
    businessId: e.businessId,
    name: e.name,
    phone: e.phone,
    email: e.email,
    customFields: safeParseObj(e.customFields),
    status: e.status as EntityDTO["status"],
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    cycles: (e.cycles ?? []).map(serializeCycle),
    notifications: (e.notifications ?? []).map(serializeNotification),
  };
}

function safeParseArr(s: string): any[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
function safeParseObj<T = any>(s: string): T {
  if (!s) return {} as T;
  try { return JSON.parse(s) as T; } catch { return {} as T; }
}
