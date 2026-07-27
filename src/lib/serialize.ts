// Helper to serialize Prisma rows into JSON-safe DTOs.
// Supports both native Postgres JSONB/Decimal and serialized legacy representations.

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
  customFieldSchema: any;
  reminderConfig: any;
  messageTemplates: any;
  tier: string;
  createdAt: Date;
};

type PrismaEntity = {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string | null;
  customFields: any;
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
  amount: any;
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
    amount: c.amount != null ? Number(c.amount) : null,
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

function safeParseArr(s: any): any[] {
  if (Array.isArray(s)) return s;
  if (!s) return [];
  try { const v = typeof s === "string" ? JSON.parse(s) : s; return Array.isArray(v) ? v : []; } catch { return []; }
}

function safeParseObj<T = any>(s: any): T {
  if (typeof s === "object" && s !== null) return s as T;
  if (!s) return {} as T;
  try { return typeof s === "string" ? JSON.parse(s) as T : (s as T); } catch { return {} as T; }
}
