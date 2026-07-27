// Vertical templates — config only, never backend code (TRD §3 / implementation-plan Key Discipline #1).
// Adding a new vertical means adding an entry here, period.

export type CycleType = "date_based" | "count_based" | "both";
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

export interface VerticalTemplate {
  verticalType: string;
  label: string;          // for the picker UI
  blurb: string;          // 1-line pitch
  entityLabel: string;    // "Member" | "Student" | "Pet" | "Client"
  cycleType: CycleType;
  icon: string;           // lucide icon name
  accent: string;         // emoji-free marketing accent (for picker chip)
  customFieldSchema: CustomFieldDef[];
  reminderConfig: ReminderConfig;
  messageTemplates: MessageTemplates;
  defaultPlanName: string;
  defaultDurationDays?: number;
  defaultUnits?: number;
}

const baseTemplates: Record<string, Omit<VerticalTemplate, "verticalType" | "label" | "blurb" | "icon" | "accent" | "entityLabel">> = {
  // shared defaults; per-vertical overrides below
};

export const VERTICAL_TEMPLATES: VerticalTemplate[] = [
  {
    verticalType: "gym",
    label: "Gym / Fitness Studio",
    blurb: "Memberships that expire on a date — monthly, quarterly, annual.",
    entityLabel: "Member",
    cycleType: "date_based",
    icon: "Dumbbell",
    accent: "Gym",
    defaultPlanName: "3-month membership",
    defaultDurationDays: 90,
    customFieldSchema: [
      { key: "membershipType", label: "Membership Type", type: "select", options: ["Monthly", "Quarterly", "Annual"], required: true },
      { key: "goal", label: "Fitness Goal", type: "text" },
      { key: "emergencyContact", label: "Emergency Contact", type: "text" },
    ],
    reminderConfig: { daysBeforeExpiry: [7, 1], sessionsRemainingThreshold: 2, sendPostExpiry: true },
    messageTemplates: {
      registration: "Hi {{name}}, welcome to {{business}}! Your {{plan}} is now active. See you soon.",
      preExpiry: "Hi {{name}}, your {{plan}} at {{business}} expires in {{days_left}} days. Reply to renew.",
      expiryDay: "Hi {{name}}, your {{plan}} at {{business}} expires today. Stop by the front desk to renew.",
      postExpiry: "Hi {{name}}, we noticed your {{plan}} at {{business}} has lapsed. Reply RENEW to restart today.",
    },
  },
  {
    verticalType: "tuition",
    label: "Tuition / Coaching Class",
    blurb: "Term- or batch-based student enrollments with end dates.",
    entityLabel: "Student",
    cycleType: "date_based",
    icon: "GraduationCap",
    accent: "Tuition",
    defaultPlanName: "Quarterly batch",
    defaultDurationDays: 90,
    customFieldSchema: [
      { key: "grade", label: "Grade / Class", type: "text", required: true },
      { key: "subject", label: "Subject", type: "text" },
      { key: "batchTiming", label: "Batch Timing", type: "select", options: ["Morning", "Afternoon", "Evening"] },
      { key: "parentContact", label: "Parent Contact", type: "text" },
    ],
    reminderConfig: { daysBeforeExpiry: [7, 1], sessionsRemainingThreshold: 2, sendPostExpiry: true },
    messageTemplates: {
      registration: "Hi {{name}}, you're enrolled for {{plan}} at {{business}}. Classes start {{start_date}}.",
      preExpiry: "Hi {{name}}, your {{plan}} at {{business}} ends in {{days_left}} days. Confirm renewal for the next term.",
      expiryDay: "Hi {{name}}, today is the last day of your {{plan}} at {{business}}. Renew to keep your seat.",
      postExpiry: "Hi {{name}}, your seat at {{business}} for {{plan}} has lapsed. Reply to re-enroll.",
    },
  },
  {
    verticalType: "salon",
    label: "Salon / Spa",
    blurb: "Count-based session packages — 10-session prepaid cards.",
    entityLabel: "Client",
    cycleType: "count_based",
    icon: "Scissors",
    accent: "Salon",
    defaultPlanName: "10-session package",
    defaultUnits: 10,
    customFieldSchema: [
      { key: "packageType", label: "Package Type", type: "select", options: ["Hair", "Skin", "Spa", "Mixed"], required: true },
      { key: "preferredStylist", label: "Preferred Stylist", type: "text" },
      { key: "allergies", label: "Allergies / Notes", type: "text" },
    ],
    reminderConfig: { daysBeforeExpiry: [7], sessionsRemainingThreshold: 2, sendPostExpiry: false },
    messageTemplates: {
      registration: "Hi {{name}}, your {{plan}} at {{business}} is now active. You have {{units_remaining}} sessions to use.",
      preExpiry: "Hi {{name}}, you have {{units_remaining}} sessions left at {{business}}. Book your next visit.",
      expiryDay: "Hi {{name}}, your last session at {{business}} has been used. Reply to buy a new package.",
      postExpiry: "Hi {{name}}, we'd love to see you back at {{business}}. Reply PACKAGES for current offers.",
    },
  },
  {
    verticalType: "pet_daycare",
    label: "Pet Boarding / Daycare",
    blurb: "Date-based pet stays with start/end dates.",
    entityLabel: "Pet",
    cycleType: "date_based",
    icon: "PawPrint",
    accent: "Pet",
    defaultPlanName: "Boarding stay",
    defaultDurationDays: 7,
    customFieldSchema: [
      { key: "species", label: "Species", type: "select", options: ["Dog", "Cat", "Other"], required: true },
      { key: "breed", label: "Breed", type: "text" },
      { key: "vaccinationDate", label: "Vaccination Date", type: "date" },
      { key: "ownerContact", label: "Owner Contact", type: "text", required: true },
    ],
    reminderConfig: { daysBeforeExpiry: [1], sessionsRemainingThreshold: 1, sendPostExpiry: true },
    messageTemplates: {
      registration: "Hi! {{name}}'s stay at {{business}} starts {{start_date}}. Pickup is {{end_date}}.",
      preExpiry: "Hi! {{name}}'s stay at {{business}} ends in {{days_left}} day(s). Pickup time?",
      expiryDay: "Hi! Today is pickup day for {{name}} at {{business}}. See you soon!",
      postExpiry: "Hi! Hope {{name}} is settled back home. Reply BOOK to schedule the next stay at {{business}}.",
    },
  },
  {
    verticalType: "amc",
    label: "AMC / Appliance Service",
    blurb: "Date-based annual service contracts with next-service-due dates.",
    entityLabel: "Client",
    cycleType: "date_based",
    icon: "Wrench",
    accent: "AMC",
    defaultPlanName: "Annual AMC",
    defaultDurationDays: 365,
    customFieldSchema: [
      { key: "assetType", label: "Asset Type", type: "select", options: ["AC", "Refrigerator", "Washing Machine", "Microwave", "Other"], required: true },
      { key: "brand", label: "Brand", type: "text" },
      { key: "model", label: "Model", type: "text" },
      { key: "address", label: "Service Address", type: "text", required: true },
    ],
    reminderConfig: { daysBeforeExpiry: [14, 7, 1], sessionsRemainingThreshold: 0, sendPostExpiry: true },
    messageTemplates: {
      registration: "Hi {{name}}, your AMC for {{plan}} at {{business}} is active until {{end_date}}.",
      preExpiry: "Hi {{name}}, your AMC at {{business}} expires in {{days_left}} days. Renew to keep coverage.",
      expiryDay: "Hi {{name}}, your AMC at {{business}} expires today. Reply RENEW to extend.",
      postExpiry: "Hi {{name}}, your AMC at {{business}} has lapsed. Reply SERVICE to schedule a one-time visit.",
    },
  },
  {
    verticalType: "rental",
    label: "Equipment / Furniture Rental",
    blurb: "Date-based rental periods with return-due reminders.",
    entityLabel: "Renter",
    cycleType: "date_based",
    icon: "Package",
    accent: "Rental",
    defaultPlanName: "30-day rental",
    defaultDurationDays: 30,
    customFieldSchema: [
      { key: "itemType", label: "Item Type", type: "text", required: true },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      { key: "deposit", label: "Deposit (₹)", type: "number" },
      { key: "address", label: "Delivery Address", type: "text" },
    ],
    reminderConfig: { daysBeforeExpiry: [3, 1], sessionsRemainingThreshold: 0, sendPostExpiry: true },
    messageTemplates: {
      registration: "Hi {{name}}, your rental {{plan}} from {{business}} is active. Return due {{end_date}}.",
      preExpiry: "Hi {{name}}, your rental at {{business}} is due back in {{days_left}} day(s). Extend or return?",
      expiryDay: "Hi {{name}}, your rental at {{business}} is due for return today.",
      postExpiry: "Hi {{name}}, your rental from {{business}} is overdue. Reply to arrange pickup or extension.",
    },
  },
];

export function getVerticalTemplate(verticalType: string): VerticalTemplate {
  return VERTICAL_TEMPLATES.find(v => v.verticalType === verticalType) ?? VERTICAL_TEMPLATES[0];
}

export function deriveEntityStatus(opts: {
  cycleType: CycleType;
  endDate: Date | null;
  unitsRemaining: number | null;
  reminderConfig?: Partial<ReminderConfig> | null;
  today?: Date;
}): "active" | "expiring_soon" | "expired" | "lapsed" {
  const today = opts.today ?? new Date();
  today.setHours(0, 0, 0, 0);

  const daysBeforeExpiry = opts.reminderConfig?.daysBeforeExpiry ?? [7, 1];
  const earliestThreshold = Math.min(...(daysBeforeExpiry.length ? daysBeforeExpiry : [7]));
  const sessionsThreshold = opts.reminderConfig?.sessionsRemainingThreshold ?? 2;

  if (opts.cycleType === "count_based" || (opts.cycleType === "both" && opts.unitsRemaining != null)) {
    const u = opts.unitsRemaining ?? 0;
    if (u <= 0) return "expired";
    if (u <= sessionsThreshold) return "expiring_soon";
    return "active";
  }

  // date_based
  if (!opts.endDate) return "active";
  const end = new Date(opts.endDate);
  end.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.round((end.getTime() - today.getTime()) / msPerDay);

  if (daysLeft < -7) return "lapsed";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= earliestThreshold) return "expiring_soon";
  return "active";
}

void baseTemplates; // exported placeholder, unused; remove if lint complains
