// Shared types between client and server. Mirrors the Prisma schema.

export type CycleType = "date_based" | "count_based" | "both";
export type EntityStatus = "active" | "expiring_soon" | "expired" | "lapsed";
export type CycleStatus = "active" | "completed" | "renewed" | "lapsed";
export type NotificationChannel = "whatsapp" | "email";
export type NotificationTrigger = "registration" | "pre_expiry" | "expiry_day" | "post_expiry";
export type Tier = "free" | "starter" | "growth" | "custom";

export interface CustomFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
  required?: boolean;
}

export interface ReminderConfig {
  daysBeforeExpiry: number[];
  sessionsRemainingThreshold: number;
  sendPostExpiry: boolean;
}

export interface MessageTemplates {
  registration: string;
  preExpiry: string;
  expiryDay: string;
  postExpiry: string;
}

export interface BusinessDTO {
  id: string;
  ownerUserId?: string;
  ownerName: string;
  name: string;
  verticalType: string;
  entityLabel: string;
  cycleType: CycleType;
  customFieldSchema: CustomFieldDef[];
  reminderConfig: ReminderConfig;
  messageTemplates: MessageTemplates;
  tier: Tier;
  createdAt: string;
}

export interface CycleDTO {
  id: string;
  entityId: string;
  planName: string;
  startDate: string;
  endDate: string | null;
  unitsTotal: number | null;
  unitsRemaining: number | null;
  status: CycleStatus;
  amount: number | null;
  createdAt: string;
}

export interface EntityDTO {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string | null;
  customFields: Record<string, string>;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  cycles: CycleDTO[];
  notifications: NotificationLogDTO[];
}

export interface NotificationLogDTO {
  id: string;
  entityId: string;
  cycleId: string | null;
  channel: NotificationChannel;
  triggerType: NotificationTrigger | string;
  message: string;
  sentAt: string;
  status: "sent" | "failed";
}

export interface ParsedEntityDraft {
  name: string;
  phone?: string;
  email?: string;
  planName: string;
  startDate: string;
  endDate?: string;
  unitsTotal?: number;
  amount?: number;
  customFields?: Record<string, string>;
  confidence: "high" | "medium" | "low";
  _rawTranscript?: string;
}
