# Technical Requirements Document (TRD)
## Product: Cycle — Universal Membership & Lifecycle CRM
**Version:** 0.1 (Draft)

---

## 1. Architecture Overview

```
┌─────────────────┐      ┌──────────────────────┐      ┌───────────────────┐
│  Web Dashboard    │◄────►│  Backend (Supabase)   │◄────►│  Postgres DB        │
│  (React, Vercel)  │      │  Auth + Edge Functions │      │  (3-table core)     │
└─────────────────┘      └──────────┬───────────┘      └───────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
          │ WhatsApp Cloud│  │ Email (Resend/ │  │ Claude API (Haiku)│
          │ API (Meta)    │  │ Brevo)         │  │ AI parsing/drafts │
          └──────────────┘  └──────────────┘  └──────────────────┘
                    ▲
          ┌──────────────────┐
          │ Cron / Scheduled   │
          │ Edge Function       │
          │ (daily expiry scan) │
          └──────────────────┘
```

**Principle:** one codebase, one schema, one reminder engine. New verticals are added via configuration (templates), never via new tables or new backend logic.

## 2. Tech Stack (₹0-start, free-tier-first)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Tailwind, hosted on Vercel free tier | Matches existing skillset, free hosting |
| Backend/DB | Supabase (Postgres + Auth + Edge Functions), free tier | Generous free tier, built-in auth, scheduled functions, JSON columns native |
| WhatsApp | WhatsApp Cloud API (Meta direct) | Cheapest official option; free conversation allowance/month |
| Email | Resend or Brevo free tier | Simple API, free tier covers early volume |
| AI | Anthropic API — Claude Haiku for parsing/drafting (cheap, fast); Claude Sonnet only for complex NL-query features later | Cost-efficient for high-volume, low-complexity calls |
| Scheduling | Supabase Edge Functions + pg_cron (or external cron via GitHub Actions free tier as fallback) | No server to manage |
| File/photo OCR | Claude API vision (image input) directly — no separate OCR service needed | Reduces vendor count |

## 3. Data Model (universal core — 3 tables + config)

### `businesses`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_user_id | uuid FK → auth.users | |
| name | text | |
| vertical_type | text | e.g. `gym`, `tuition`, `salon`, `amc`, `rental`, `vet_daycare` |
| entity_label | text | e.g. "Member", "Student", "Pet", "Client" — display label only |
| cycle_type | enum | `date_based` \| `count_based` \| `both` |
| custom_field_schema | jsonb | defines which custom fields this vertical uses, e.g. `{"breed":"text","vaccination_date":"date"}` |
| reminder_config | jsonb | `{"days_before_expiry":[7,1], "sessions_remaining_threshold":2}` |
| message_templates | jsonb | per-trigger message copy, editable |
| tier | text | `free` \| `starter` \| `growth` \| `custom` |
| created_at | timestamptz | |

### `entities`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | client/member/pet name |
| phone | text | for WhatsApp |
| email | text | nullable |
| custom_fields | jsonb | free-form, keyed per `custom_field_schema` |
| status | enum | `active` \| `expiring_soon` \| `expired` \| `lapsed` (derived, cached for query speed) |
| created_at | timestamptz | |

### `cycles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK | |
| plan_name | text | e.g. "3-month membership", "10-session package" |
| start_date | date | |
| end_date | date | nullable — used for date_based |
| units_total | int | nullable — used for count_based (e.g. 10 sessions) |
| units_remaining | int | nullable, decremented on usage |
| status | enum | `active` \| `completed` \| `renewed` \| `lapsed` |
| amount | numeric | optional, for owner's own record-keeping |
| created_at | timestamptz | |

### `notifications_log`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| cycle_id | uuid FK | |
| channel | enum | `whatsapp` \| `email` |
| trigger_type | text | `registration` \| `pre_expiry` \| `expiry_day` \| `post_expiry` |
| sent_at | timestamptz | |
| status | enum | `sent` \| `failed` |

**Why this scales to every vertical:** `entity_label`, `custom_field_schema`, `cycle_type`, and `reminder_config` on `businesses` are the only things that change per vertical. The tables, reminder engine, and dashboard code never change.

## 4. Reminder Engine Logic

Single scheduled job, runs once daily (Edge Function + pg_cron):

```
FOR each active cycle:
  IF cycle_type == date_based:
      days_left = end_date - today
      IF days_left IN business.reminder_config.days_before_expiry:
          send_notification(trigger = "pre_expiry")
      IF days_left == 0:
          send_notification(trigger = "expiry_day")
          mark_cycle_status("lapsed") if no renewal action

  IF cycle_type == count_based:
      IF units_remaining <= business.reminder_config.sessions_remaining_threshold:
          send_notification(trigger = "pre_expiry")
      IF units_remaining == 0:
          send_notification(trigger = "expiry_day")
```

Message content is pulled from `business.message_templates[trigger_type]`, with entity/cycle fields interpolated. Templates are either owner-edited or AI-drafted at business setup (see AI section).

## 5. AI Integration Points

| Feature | Model | Input | Output | Trigger |
|---|---|---|---|---|
| Voice-to-entity | Claude Haiku (+ audio transcription step) | Voice note transcript | Structured JSON: `{name, phone, plan_name, start_date, duration, amount}` | Owner sends voice note via WhatsApp/dashboard upload |
| Photo-to-bulk-import | Claude API (vision, Haiku or Sonnet depending on handwriting complexity) | Image of register page | Array of structured entity+cycle JSON objects | Owner uploads photo |
| Message drafting | Claude Haiku | Business vertical + trigger type + tone preference | Draft message template text | At business setup, or on-demand edit |
| NL dashboard query (v2) | Claude Haiku/Sonnet | Owner's plain-language question + schema context | SQL-safe filtered query / summarized answer | Owner types in dashboard search bar |
| Churn/pattern flagging (v2) | Claude Sonnet (batch, not real-time) | Historical visit/renewal data per entity | Risk flag + reason | Weekly batch job |

**Critical safeguard:** all AI-parsed entity data is shown to the owner in an editable confirm screen before it's written to the database. No AI output is auto-committed on the first pass — this prevents silent data corruption from misheard voice notes or misread handwriting.

## 6. API Surface (internal, via Supabase Edge Functions)

- `POST /entities` — create entity + initial cycle (manual or AI-parsed payload)
- `PATCH /entities/:id` — update entity/cycle
- `POST /entities/parse-voice` — accepts audio, returns structured draft (not yet saved)
- `POST /entities/parse-photo` — accepts image, returns array of structured drafts
- `GET /dashboard/entities?status=&search=&sort=` — filtered list
- `POST /businesses` — create business + apply vertical template
- `PATCH /businesses/:id/templates` — edit message templates / reminder config
- Internal cron: `run-daily-reminder-scan` (not user-facing)

## 7. Security & Compliance Notes

- Supabase Row Level Security (RLS): every table scoped by `business_id` → `owner_user_id`, so one owner can never query another's data.
- Phone numbers/emails are PII — store only what's needed, no third-party analytics sharing.
- WhatsApp Cloud API requires business verification with Meta before scaling past sandbox limits — flag this as a setup dependency, not a blocker for MVP testing.
- No payment data stored in v1 (amount field is informational only, not a payment processor integration).

## 8. Non-Functional Requirements

- Dashboard load time < 2s for up to 500 entities per business.
- Daily reminder scan must complete within a single scheduled function execution window (Supabase Edge Function timeout limits — batch if entity count grows large).
- System must degrade gracefully if WhatsApp API fails (fallback to email, log failure in `notifications_log`).
