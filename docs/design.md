# design.md
## Product: Cycle — Universal Membership & Lifecycle CRM
Visual design system adapted from a clean, engineering-led SaaS aesthetic (white canvas, single emerald accent, product-UI-as-hero). This document defines the design **tokens** (carried over) and **what specifically to design** for Cycle's dashboard and marketing site.

---

## 1. Design Tokens (carried over, unchanged)

### Colors

**Brand & Accent**
- `{colors.primary}` `#3ecf8e` — signature CTA green. Used sparingly: filled buttons, wordmark accent, status dot for "active."
- `{colors.primary-deep}` `#24b47e` — pressed state.
- `{colors.primary-soft}` `#4ade80` — chart/status accents.
- `{colors.accent-yellow}` `#ffdb13` — reserved for "expiring soon" status indicator only.
- `{colors.accent-purple}` `#6b01c2` / `{colors.accent-violet}` `#644fc1` — reserved for rare chart highlights (e.g. AI feature badges), never buttons.

**Surface**
- `{colors.canvas}` `#ffffff` — default background.
- `{colors.canvas-soft}` `#fafafa` — alternating section bands, dashboard sidebar.
- `{colors.canvas-night}` `#1c1c1c` — code/log-style panels (e.g. `notifications_log` activity feed), featured pricing tier.
- `{colors.canvas-night-soft}` `#202020` — nested chrome within dark panels.
- `{colors.hairline}` `#dfdfdf` — card/table borders.
- `{colors.hairline-strong}` `#c7c7c7` — emphasis borders.
- `{colors.hairline-cool}` `#ededed` / `#efefef` / `#d4d4d4` — grey ladder for fine chrome.

**Text**
- `{colors.ink}` `#171717` — default body text.
- `{colors.ink-secondary}` `#212121`
- `{colors.ink-mute}` `#707070` — secondary/helper copy.
- `{colors.ink-mute-2}` `#9a9a9a` — tertiary text.
- `{colors.ink-faint}` `#b2b2b2` — disabled/placeholder.
- `{colors.on-primary}` `#171717` — near-black text on the emerald button (never white — this is the brand's signature quirk).
- `{colors.on-dark}` `#ffffff` — text on dark surfaces.

**Status colors for this product specifically** (new — additive, kept within the existing accent set, never introducing new hues):
- Active → `{colors.primary}` emerald dot
- Expiring soon → `{colors.accent-yellow}` dot
- Expired/Lapsed → `{colors.ink-faint}` grey dot (deliberately muted, not alarming red — this is a calm, non-punitive product)

### Typography

Font: **Circular** (proprietary) with **Inter** at weight 500 as the open-source substitute, negative tracking on display tiers. Code/log panels use system mono.

| Token | Size | Weight | Use in Cycle |
|---|---|---|---|
| `{typography.display-xxl}` 64px | 500 | -1.92px tracking | Marketing hero only |
| `{typography.display-lg}` 36px | 500 | -0.72px | Dashboard section headers (e.g. "Clients") |
| `{typography.display-md}` 28px | 500 | -0.42px | Pricing tier price, empty-state headline |
| `{typography.heading-lg}` 22px | 500 | 0 | Card titles (entity name in detail view) |
| `{typography.heading-md}` 18px | 500 | 0 | Table column groupings, modal titles |
| `{typography.body-lg}` 18px | 400 | 0 | Marketing lead copy |
| `{typography.body-md}` 16px | 400 | 0 | Default dashboard body text, table cells |
| `{typography.button-md}` 14px | 500 | 0 | All buttons |
| `{typography.caption}` 13px | 400 | 0 | Helper text, timestamps |
| `{typography.micro}` 12px | 400 | 0 | Status pill labels |
| `{typography.code}` 14px | 400 mono | 0 | Notification log entries, JSON custom-field preview |

### Shape & Elevation

- Buttons: `{rounded.sm}` 6px, square-ish, never pill.
- Cards: `{rounded.lg}` 12px.
- Status pills: `{rounded.full}`.
- Elevation Level 1 (`0 1px 3px rgba(0,0,0,0.06)`) for default cards; Level 2 for floating elements (AI confirm-modal, notification toast).

### Spacing

8px base unit. Section padding 64–96px on marketing; card padding 32px on feature/pricing cards; dashboard density is tighter — use 16px (`{spacing.lg}`) internal card padding, not 32px, since this is a data-dense working tool, not a marketing surface.

---

## 2. What to Design — Screen by Screen

### 2.1 Marketing site (public, follows brand system closely)
- **Hero**: `{typography.display-xxl}` headline on `{colors.canvas}`, no gradient. Headline should center on the outcome ("Never miss a renewal again") not the tech. Single `button-primary-green` CTA ("Start free").
- **Product screenshot band**: composited dashboard mockup (entity list + status pills + WhatsApp reminder preview) inside a `{rounded.lg}` container with Level 2 shadow — this is the brand's signature move, and it fits Cycle well since the dashboard *is* the product.
- **Vertical showcase section**: instead of one screenshot, show 3 small `card-feature-light` cards side by side — same dashboard, different `entity_label` (Gym → "Members", Salon → "Clients", Tuition → "Students") — visually proving the "one tool, many businesses" pitch without needing separate copy blocks.
- **Pricing**: standard `card-pricing` 4-up (Free / Starter / Growth / Custom) collapsing per breakpoint rules already defined; Growth tier can use `card-pricing-featured` (dark inverted) since it's the intended default upsell.

### 2.2 Owner Dashboard (core product surface)

**Layout**: Left sidebar (`nav-bar` pattern, but vertical) on `{colors.canvas-soft}`, main content on `{colors.canvas}`. This is a departure from the pure-white-only marketing pages — dashboards need a subtle sidebar/content contrast for orientation, so introduce `{colors.canvas-soft}` as the sidebar fill only.

- **Entity list view** (primary screen):
  - Table/card-hybrid list, one row per entity: name, vertical-specific label field (e.g. "3-month plan"), status pill, days-until-expiry or sessions-remaining, last contact.
  - Status pill uses the three status colors defined above — this is the single most important visual signal in the product; must be scannable at a glance down the whole list.
  - Filter bar above table: status filter (chips using `pill-tag-soft` for inactive, `pill-tag-green` for the active filter), search input (`text-input` token), sort dropdown.
  - Empty state (new business, no entities yet): centered `{typography.display-md}` headline + two large tappable options — "Add manually" / "Add via voice or photo" — since AI entry is the differentiator, give it equal or greater visual weight than the manual form, not a buried secondary option.

- **Add Entity flow**:
  - Modal (Level 3 elevation) with three entry tabs: **Voice**, **Photo**, **Manual** — voice/photo tabs are default-selected, manual is the fallback tab, reflecting product priority.
  - Voice tab: record/upload button, waveform-style placeholder, then a **review card** showing the AI-parsed fields with each field individually editable before save — never a silent auto-save.
  - Photo tab: image upload/drag-zone, then a **bulk review list** — one row per detected entity, each editable, with a checkbox to exclude misreads before bulk-confirming.
  - Manual tab: plain `text-input` form, fields driven dynamically by `business.custom_field_schema`.

- **Entity detail view**:
  - `{typography.heading-lg}` name at top, status pill beside it.
  - Cycle history as a simple vertical timeline (not a table) — start date, plan, renewals — this is one place a slightly more editorial layout (vs. dense table) helps readability.
  - Notification log for this entity rendered in a `code-block`-style dark panel (`{colors.canvas-night}`, `{typography.code}`) — reinforces the "system log" feel and visually differentiates automated activity from owner-entered data.
  - Actions: "Mark renewed," "Edit," "Send reminder now" (manual override) as `button-secondary-outline`.

- **Business settings screen**:
  - Vertical template selector (only editable at setup, shown read-only after — avoid letting owners accidentally break their schema).
  - Reminder rules editor: simple stepper inputs for "days before expiry" / "sessions remaining threshold."
  - Message template editor: one `text-input`-style textarea per trigger type (registration / pre-expiry / expiry-day), with an "AI-draft this" `button-link` next to each — reinforces AI as an assistive, not autonomous, tool.

- **Notification toast**: Level 2 elevation, top-right, `{colors.canvas}` background, green left-border accent on success, muted grey on informational — appears when a reminder batch completes or an AI parse finishes.

### 2.3 Component additions specific to Cycle (not in the base system, built consistent with its tokens)

- **`status-pill-active`** — background `{colors.primary}` at 12% opacity, text `{colors.primary-deep}`, dot indicator, `{rounded.full}`, `{typography.micro}`.
- **`status-pill-expiring`** — same structure, `{colors.accent-yellow}` at 12% opacity / darker yellow text.
- **`status-pill-lapsed`** — same structure, `{colors.ink-faint}` background tint / `{colors.ink-mute}` text — intentionally the least visually alarming of the three, since the product's tone is "helpful nudge," not "warning."
- **`ai-review-card`** — `card-feature-light` base, with a small `pill-tag-soft` labeled "AI-suggested" in the corner, and each field rendered as an inline-editable `text-input` rather than static text — the visual cue that this data hasn't been confirmed yet.
- **`activity-log-panel`** — `code-block` token repurposed: dark panel, `{typography.code}`, each line prefixed with a timestamp in `{colors.ink-mute-2}` — used for the notification history feed.

---

## 3. Do's and Don'ts (product-specific additions to the base system's rules)

### Do
- Keep the three status-pill colors as the *only* place color carries meaning in the dashboard — everything else stays monochrome, per the base system's restraint.
- Give AI-entry (voice/photo) equal visual priority to manual entry — it's the core differentiator, not a hidden feature.
- Use the dark `code-block` styling for anything system-generated (notification logs), and pure white cards for anything owner-entered — this creates an implicit visual language of "automated vs. manual" without needing extra labels.

### Don't
- Don't use red for the "lapsed/expired" status — the base system has no red in its palette, and this product's tone should stay calm/helpful rather than punitive toward either the owner or the client.
- Don't let the dashboard sidebar introduce a second accent color for navigation state — active nav item uses `{colors.ink}` text + a thin `{colors.primary}` left-border, nothing more.
- Don't skip the AI confirm-before-save step in any UI, ever — this is a trust requirement, not just a design preference.
