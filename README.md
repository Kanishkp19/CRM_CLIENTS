# Cycle — Universal Membership & Lifecycle CRM

One lightweight, AI-assisted CRM for small local service businesses that sell
anything with a **start and an end** — gym memberships, tuition terms, salon
packages, equipment rentals, AMC contracts, pet boarding stays.

One engine, many businesses. A gym, a dance class, and a pest-control vendor
all run on the exact same backend, differentiated only by configuration.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York)
- **Database:** Prisma ORM with SQLite (file-based, zero-config)
- **State:** Zustand (client) + TanStack Query (server)
- **AI:** `z-ai-web-dev-sdk` — LLM for voice-parse/template drafting, Vision for photo-of-register, ASR for voice notes
- **Icons:** lucide-react

## Quick Start

```bash
# 1. Install dependencies
bun install   # or: npm install / pnpm install

# 2. Create your .env file
cp .env.example .env
# (optional) add ZAI_API_KEY for real AI parsing — without it, AI calls
# gracefully fall back to empty drafts with "low confidence" badges.

# 3. Push the Prisma schema to SQLite (creates db/custom.db)
bun run db:push

# 4. Start the dev server
bun run dev
# → open http://localhost:3000

# 5. (Optional) Seed demo data on first load via the UI:
#    On the marketing page click "Start free" → "Skip — load demo data".
#    This provisions "Pulse Fitness Studio" with 8 sample members +
#    backfilled notifications so the dashboard isn't empty.
```

## Project Structure

```
cycle-crm/
├── prisma/
│   └── schema.prisma          # 3-table universal core: Business → Entity → Cycle + NotificationLog
├── public/
│   ├── logo.svg
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Single-route shell with Zustand view-switching
│   │   ├── globals.css        # Design tokens (design.md §1) + component primitives
│   │   └── api/
│   │       ├── business/                       # Business CRUD + onboarding
│   │       ├── entities/                       # Entity CRUD + filtered list
│   │       ├── entities/[id]/                  # PATCH/DELETE
│   │       ├── entities/[id]/renew/            # Mark renewed → new cycle, archive old
│   │       ├── entities/[id]/send-reminder/    # Manual "Send reminder now" override
│   │       ├── entities/parse-voice/           # ASR + LLM → draft (confirm-before-save)
│   │       ├── entities/parse-photo/           # Vision model → bulk drafts
│   │       ├── cycles/[id]/decrement/          # Count-based: consume 1 session
│   │       ├── templates/                      # AI-draft message templates
│   │       ├── reminder-scan/                  # Daily scan job (TRD §4)
│   │       └── seed/                           # Demo data loader
│   ├── components/
│   │   ├── ui/                # shadcn/ui component library
│   │   └── cycle/
│   │       ├── status-pill.tsx
│   │       ├── activity-log-panel.tsx
│   │       └── views/
│   │           ├── marketing.tsx              # Hero + vertical showcase + pricing
│   │           ├── onboarding.tsx             # 3-step (vertical → details → AI draft)
│   │           ├── dashboard.tsx              # Sidebar + entity list + filters
│   │           ├── entity-detail.tsx          # Cycle timeline + dark log + actions
│   │           ├── settings.tsx              # Reminder rules + template editor
│   │           └── add-entity-modal.tsx       # Voice / Photo / Manual tabs (AI confirm)
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── verticals.ts       # 6 vertical templates (config-only, per TRD §3)
│   │   ├── zai.ts             # Z-AI SDK wrapper (parse-voice / parse-photo / draft-templates)
│   │   ├── types.ts           # Shared DTOs
│   │   ├── store.ts           # Zustand view-routing store
│   │   ├── serialize.ts       # Prisma row → JSON-safe DTO
│   │   └── utils.ts
│   └── hooks/
│       ├── use-toast.ts
│       └── use-mobile.ts
├── docs/
│   ├── PRD.md                 # Product requirements
│   ├── TRD.md                 # Technical design
│   ├── design.md              # Visual/UI design system
│   ├── implementation-plan.md # Phased build plan
│   └── product-overview.md    # Top-level README from spec
├── .env.example
├── .gitignore
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json
├── Caddyfile                  # Reverse proxy config (optional, for production)
└── README.md                  # This file
```

## Architecture (from TRD.md)

```
Web Dashboard (React)  ◄──►  Next.js API Routes  ◄──►  SQLite (Prisma)
                                      │
                                      ├──► Z-AI SDK (LLM + VLM + ASR)
                                      ├──► Notification log (stub: WhatsApp/SMTP not wired)
                                      └──> Daily reminder scan (TRD §4)
```

**Universal core — 3 tables + config, never new code per vertical:**
- `Business` (vertical identity: `verticalType`, `entityLabel`, `cycleType`, `customFieldSchema`, `reminderConfig`, `messageTemplates`)
- `Entity` (client / member / pet / asset — same model)
- `Cycle` (time-bound or count-bound lifecycle unit)
- `NotificationLog` (audit trail of every outbound message)

Adding a new vertical (e.g. co-working space) = adding an entry to `VERTICAL_TEMPLATES`
in `src/lib/verticals.ts`. No new tables, no new backend logic.

## Key Disciplines (from implementation-plan.md)

1. **Never write vertical-specific backend code.** If a new vertical seems to
   need a new table or new logic, the core schema needs a rethink, not a patch.
2. **Never auto-commit AI-parsed data.** Every AI-suggested entity/cycle passes
   through an owner confirm step before saving (see `add-entity-modal.tsx`).
3. **Status is the only place color carries meaning** in the dashboard
   (see design.md "Do" / "Don't"). Emerald = active, yellow = expiring, grey = lapsed.
   No red anywhere — this is a calm, non-punitive product.

## Production Notes

- **WhatsApp Cloud API** + **Resend/Brevo** transports are stubbed in
  `notifications_log` writes (search for "stub" in the API routes). Wire them
  in by replacing the `db.notificationLog.create` calls with actual API calls
  + a fallback to email on WhatsApp failure.
- **pg_cron equivalent:** in production, schedule a daily HTTP POST to
  `/api/reminder-scan` via GitHub Actions, Vercel Cron, or equivalent.
- **Auth:** single-tenant demo (one business per DB). Add NextAuth.js +
  RLS-style scoping (`business.owner_user_id`) for multi-tenant.
- **Database:** swap SQLite for Postgres by changing `provider` in
  `prisma/schema.prisma` and `DATABASE_URL` in `.env`.

## Specs

Full product / technical / design docs live in `docs/`. Read them in this order:
1. `docs/product-overview.md` — the elevator pitch
2. `docs/PRD.md` — problem, users, features, pricing
3. `docs/TRD.md` — architecture, data model, AI integration, API surface
4. `docs/design.md` — design tokens + screen-by-screen UI spec
5. `docs/implementation-plan.md` — phased build plan

## License

Proprietary — pre-build, all rights reserved.
