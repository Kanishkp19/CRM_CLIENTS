# Product Requirements Document (PRD)
## Product: Cycle — Universal Membership & Lifecycle CRM
**Version:** 0.1 (Draft) &nbsp;|&nbsp; **Owner:** Kanishk &nbsp;|&nbsp; **Status:** Pre-build

---

## 1. Problem Statement

Millions of small, single-location service businesses sell something that has a **start date and an end date** — a membership, a package, a rental, a contract, a stay. Today they track this on paper registers, WhatsApp chats, or Excel sheets. This causes three recurring failures:

1. **Owners forget to follow up** when a client's time is about to expire, losing renewal revenue.
2. **Owners avoid awkward conversations** ("your membership ended") because there's no neutral system doing it for them.
3. **There is no single view** of who is active, who is expiring, and who has already lapsed.

Existing software (Wellyx, Spark Membership, YDL, Igymsoft, etc.) solves this **only for gyms**, is feature-heavy (biometrics, multi-branch billing), and is priced for larger fitness chains — not for a single-owner tuition center, salon, AMC vendor, or pet daycare.

## 2. Vision

One lightweight, configurable engine that models **any time-bound or count-bound client relationship** — membership, package, rental, contract, stay — and automates the lifecycle communication (registration → active → expiry reminder → renewal/lapse), with AI removing the data-entry burden so the owner does almost nothing manually.

## 3. Target Users

**Primary:** Solo or small-team owners of local service businesses in India who currently track clients on paper, Excel, or WhatsApp, and have no dedicated software today.

**Initial verticals (launch priority):**
| Priority | Vertical | Entity | Cycle type |
|---|---|---|---|
| P0 | Gyms / yoga / martial arts studios | Member | Date-based (membership expiry) |
| P0 | Tuition / coaching / music & dance classes | Student | Date-based (term/batch expiry) |
| P0 | Salons & spas | Client | Count-based (sessions remaining) |
| P1 | Pet boarding / daycare / grooming | Pet | Date-based (stay duration) |
| P1 | AMC / pest control / appliance service | Client + Asset | Date-based (next service due) |
| P1 | Rental businesses (equipment/furniture) | Renter + Item | Date-based (return due) |
| P2 | Co-working spaces | Member | Date-based (seat/desk expiry) |
| P2 | Vehicle/document renewal agents | Client + Vehicle | Date-based (RC/insurance/PUC due) |
| P2 | Physiotherapy/diagnostic clinics | Patient | Count-based (session package) |
| P2 | Libraries/reading rooms | Member | Date-based |
| P2 | LPG/water can subscription vendors | Household | Count/date-based |
| P2 | Society/apartment parking or facility management | Resident | Date-based |

The system must support all of these **without new code per vertical** — only new configuration (see TRD).

## 4. Goals & Non-Goals

**Goals**
- Let an owner get a working, automated reminder system live in under 10 minutes.
- Require the least possible manual data entry (AI-assisted entry is core, not optional).
- Work identically across all verticals through one configurable data model.
- Be cheap enough to run at ₹0 infrastructure cost pre-revenue (free tiers only).

**Non-Goals (explicitly out of scope for v1)**
- Biometric access control / hardware integration.
- Full accounting/invoicing/GST billing suite.
- Multi-branch enterprise management.
- Native mobile apps (web-first, mobile-responsive only).
- Payment gateway integration (v1 tracks payment status manually; gateway is v2+).

## 5. Core Feature Set

### 5.1 Entity & Cycle Management (universal core)
- Create a "Business" with a vertical type (from template list) → auto-provisions field labels and default reminder rules.
- Add/edit/delete **Entities** (member, student, pet, asset, renter — label changes per vertical, underlying model identical).
- Each entity has one or more **Cycles**: a start date + (end date OR units remaining), plus a status (active / expiring soon / expired / lapsed).
- Manual and AI-assisted entity creation (see 5.3).
- Owner dashboard: list + filter by status, search, sort by expiry.

### 5.2 Automated Communication
- WhatsApp + email notification on:
  - Registration confirmation.
  - Configurable pre-expiry reminder (e.g., 7 days before / 3 sessions remaining).
  - Expiry-day notice.
  - Optional post-expiry lapse follow-up.
- Owner receives their own notification digest (e.g., "3 clients expiring this week").
- Message templates are vertical-aware and editable per business.

### 5.3 AI-Assisted Data Entry (key differentiator)
- **Voice-to-entity**: owner sends a voice note ("Ramesh, 3 month membership, ₹1500, starts today") → parsed into a structured entity + cycle automatically.
- **Photo-to-bulk-import**: photo of a handwritten register page → OCR + LLM extraction → bulk entity creation with owner review/confirm step before saving.
- **AI-drafted reminder copy**: message wording auto-generated per vertical/tone, editable once and reused.
- (v2) Natural-language dashboard queries: "who's expiring this week and hasn't paid."
- (v2) Churn/no-show pattern flagging based on visit history, not just calendar dates.

### 5.4 Business Configuration
- Vertical template picker at signup (pre-fills field labels, default cycle type, default reminder cadence, default message tone).
- Custom fields per business (JSON-backed, no schema change needed).
- Branding: business name/logo on outbound messages (paid tier).

## 6. User Flows (high-level)

1. **Owner onboarding**: sign up → pick vertical → confirm/edit default template → done. Under 5 minutes.
2. **Adding a client**: tap "Add" → choose voice note / photo / manual form → AI structures data → owner confirms → saved.
3. **Automated lifecycle**: system runs a daily check → flags entities crossing reminder thresholds → sends WhatsApp/email → updates dashboard status.
4. **Renewal**: owner marks a cycle as renewed (or client self-renews via a link, v2) → new cycle created, old cycle archived.

## 7. Monetization

Subscription (SaaS), not one-time sale — recurring reminder infrastructure (WhatsApp/AI API costs) requires recurring revenue. See full rationale already discussed.

| Tier | Includes | Price (indicative) |
|---|---|---|
| Free | ≤ 20 active entities, email reminders only, 1 vertical template | ₹0 |
| Starter | WhatsApp reminders, unlimited entities, 1 vertical | ₹299–499/mo |
| Growth | + AI voice/photo entry, smart follow-ups, multi-staff login | ₹999–1500/mo |
| Custom | Branding, extra custom fields, integrations | ₹2000+/mo or setup fee + monthly |

Sell the **outcome** ("no client renewal ever falls through the cracks"), not the software.

## 8. Success Metrics

- **Activation**: % of signups that add ≥ 5 entities within first session.
- **AI adoption**: % of entities created via voice/photo vs. manual form (target > 50%).
- **Retention proxy**: % of businesses with at least one reminder sent successfully in week 1.
- **Conversion**: Free → Paid tier conversion rate within 30 days.
- **Vertical spread**: number of distinct verticals with ≥ 1 active paying business (validates "universal" thesis).

## 9. Risks

| Risk | Mitigation |
|---|---|
| WhatsApp Cloud API free-tier limits hit fast at scale | Track usage per business, throttle/warn before paid tier upgrade forced |
| AI parsing errors on voice/photo entry (wrong name/date) | Always show a confirm-before-save review step, never auto-commit |
| Feature creep per vertical breaks "universal" model | New vertical = new JSON template only, never new backend logic — enforce in TRD |
| Competing directly with entrenched gym CRMs | De-prioritize gym-only positioning; lead with under-served verticals (tuition, AMC, rental) |
