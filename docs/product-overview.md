# Cycle — Universal Membership & Lifecycle CRM

Cycle is a lightweight, AI-assisted CRM for small local service businesses that sell anything with a **start and an end** — a gym membership, a tuition term, a salon package, an equipment rental, an AMC contract, a pet boarding stay.

Instead of tracking clients on paper, Excel, or WhatsApp chats, business owners register clients once (often just by sending a voice note or a photo of their register), and Cycle automatically:

- Tracks each client's active period or remaining sessions
- Sends WhatsApp/email reminders before something expires
- Gives the owner a single dashboard of active, expiring, and lapsed clients

One engine, many businesses — a gym, a dance class, and a pest-control vendor all run on the exact same backend, differentiated only by configuration, not code.

## Why

Existing gym/salon CRMs (Wellyx, Spark Membership, Igymsoft, etc.) solve this only for fitness businesses and are priced/featured for larger chains. Most other local service businesses — tuition centers, AMC vendors, rental shops, pet daycares — have no dedicated tool at all and still run on notebooks. Cycle targets that underserved space with a single configurable product.

## Core Idea

Every supported business type reduces to the same model:

```
Business → Entity (client/member/pet/asset) → Cycle (date-based or count-based) → Notification
```

Adding a new vertical (e.g. "co-working space") means adding a config template — field labels, reminder rules, message tone — never new backend code. See `TRD.md` for the full schema.

## Documents in This Project

| File | Purpose |
|---|---|
| `PRD.md` | Product requirements — problem, users, features, pricing, success metrics |
| `TRD.md` | Technical design — architecture, data model, AI integration, API surface |
| `design.md` | Visual/UI design system for the dashboard and marketing site |
| `implementation-plan.md` | Phased build plan from MVP to multi-vertical scale |

## Supported Verticals (v1 launch targets)

Gyms & fitness studios · Tuition/coaching centers · Salons & spas · Pet boarding/daycare · AMC & appliance service · Rental businesses

*(Additional verticals — co-working, vehicle renewal agents, physiotherapy clinics, libraries, subscription vendors, society management — are supported by the same core and added as later config templates; see `PRD.md` §3.)*

## Tech Stack

- **Frontend:** React + Tailwind, deployed on Vercel
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Messaging:** WhatsApp Cloud API (Meta), Resend/Brevo for email
- **AI:** Anthropic Claude API (Haiku for parsing/drafting, Sonnet for complex features)
- **Scheduling:** Supabase Edge Functions + pg_cron for daily reminder scans

Chosen specifically to start at **₹0 infrastructure cost** using free tiers across the stack. Full rationale in `TRD.md` §2.

## Key Differentiator

AI-assisted data entry: owners add clients via a **voice note** or a **photo of their handwritten register** instead of filling forms — the AI structures the data and the owner just confirms it. No competitor in this space currently offers this.

## Status

Pre-build. See `implementation-plan.md` for the current phase and next steps.
