# Implementation Plan
## Product: Cycle — Universal Membership & Lifecycle CRM

Guiding rule for every phase: **build the universal core first, validate on one real business, only then generalize to more verticals.** Do not build all 12 verticals before phase 1 has a live paying/piloting user.

---

## Phase 0 — Setup (Week 1)

- [ ] Set up Supabase project (free tier), Postgres schema from `TRD.md` §3 (`businesses`, `entities`, `cycles`, `notifications_log`)
- [ ] Set up Row Level Security policies scoped to `owner_user_id`
- [ ] Set up Vercel project + React/Tailwind skeleton
- [ ] Register WhatsApp Cloud API sandbox with Meta (business verification can run in parallel, not a blocker for dev)
- [ ] Set up Resend/Brevo free-tier email account
- [ ] Set up Anthropic API key, confirm Haiku access for parsing tasks

**Exit criteria:** Empty app deployed, DB reachable, one test WhatsApp message sent successfully from sandbox.

---

## Phase 1 — Universal Core MVP (Weeks 2–4)

Scope: **one vertical only** — pick whichever you have a real pilot business lined up for (gym, tuition center, or salon are the most reachable first pilots).

- [ ] Business signup flow: pick vertical → apply default template (`entity_label`, `cycle_type`, default `reminder_config`, default `message_templates`)
- [ ] Manual entity + cycle creation form (basic CRUD)
- [ ] Dashboard: list view with status filter (active / expiring soon / expired) and search
- [ ] Daily reminder scan Edge Function (date-based trigger only — skip count-based for now)
- [ ] WhatsApp send integration wired to `notifications_log`
- [ ] Email fallback if WhatsApp send fails
- [ ] Manual "mark as renewed" action (creates new cycle, archives old one)

**Exit criteria:** A real pilot business owner adds 10+ real clients manually, receives at least one real automated reminder, without your intervention.

---

## Phase 2 — AI-Assisted Entry (Weeks 5–6)

This is the core differentiator — prioritize before adding more verticals.

- [ ] Voice-note upload → transcription → Claude Haiku structured parsing → confirm-before-save screen
- [ ] Photo-of-register upload → Claude vision parsing → bulk draft list → confirm-before-save screen
- [ ] AI-drafted message templates at business setup (owner picks tone, AI generates copy, owner can edit)
- [ ] Error-handling: AI parsing failures fall back gracefully to manual form, never silently drop data

**Exit criteria:** Pilot owner adds a client via voice note or photo successfully at least 3 times without manual form fallback.

---

## Phase 3 — Multi-Vertical Expansion (Weeks 7–9)

- [ ] Build 2 more vertical templates (recommend: tuition/coaching + salon, or whichever weren't chosen in Phase 1) — config only, no new backend logic
- [ ] Add count-based cycle support to the reminder engine (sessions-remaining trigger)
- [ ] Onboard 1 pilot business per new vertical
- [ ] Validate: confirm zero backend code changes were needed to onboard a new vertical (this is the test of whether the "universal" architecture actually holds)

**Exit criteria:** 3 verticals live with real businesses, using the identical codebase and schema.

---

## Phase 4 — Monetization Layer (Weeks 10–11)

- [ ] Implement tier logic: Free (≤20 entities, email only) / Starter (WhatsApp, unlimited) / Growth (AI features gated) / Custom
- [ ] Payment collection for subscriptions (Razorpay or similar — simplest available for Indian SMB payments)
- [ ] Usage limits enforcement (entity count caps, WhatsApp message caps on free tier)
- [ ] Basic billing/renewal reminders for your own subscribers (dogfooding the product on itself is a nice proof point)

**Exit criteria:** First paying customer converted from a pilot business.

---

## Phase 5 — Scale Features (Post-validation, not before)

Only pursue once Phases 1–4 are validated with real paying users across ≥3 verticals:

- [ ] Natural-language dashboard search
- [ ] Churn/no-show pattern flagging (batch AI job)
- [ ] Client self-service (renewal links, pause requests)
- [ ] WhatsApp-side AI auto-replies for simple client queries
- [ ] Multi-staff logins per business
- [ ] Remaining verticals from the full list (co-working, vehicle renewal, physiotherapy, libraries, subscription vendors, society management)

---

## Key Discipline Rules Throughout

1. **Never write vertical-specific backend code.** If a new vertical seems to need a new table or new logic, that's a signal the core schema needs a rethink — not a one-off patch.
2. **Never auto-commit AI-parsed data.** Every AI-suggested entity/cycle must pass through an owner confirm step before saving.
3. **Don't build Phase 3+ features speculatively.** Wait for a real pilot user's pain point to justify each addition.
4. **Keep infra at ₹0 until there's revenue.** Free tiers (Supabase, Vercel, Resend, WhatsApp sandbox) should comfortably cover the first 2–3 pilot businesses.
