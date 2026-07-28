"use client";

import { useAppStore } from "@/lib/store";
import { VERTICAL_TEMPLATES } from "@/lib/verticals";
import {
  Dumbbell,
  GraduationCap,
  Scissors,
  PawPrint,
  Wrench,
  Package,
  ArrowRight,
  Check,
  Mic,
  Camera,
} from "lucide-react";

const ICONS: Record<string, any> = {
  Dumbbell,
  GraduationCap,
  Scissors,
  PawPrint,
  Wrench,
  Package,
};

const PRICING = [
  {
    tier: "Free",
    price: "₹0",
    period: "forever",
    blurb: "Get the engine running.",
    features: ["≤ 20 active entities", "Email reminders only", "1 vertical template", "Manual data entry"],
    cta: "Start free",
    featured: false,
  },
  {
    tier: "Starter",
    price: "₹299",
    period: "/mo",
    blurb: "WhatsApp reminders, unlimited.",
    features: ["Unlimited entities", "WhatsApp + email reminders", "1 vertical", "Manual entry"],
    cta: "Start 14-day trial",
    featured: false,
  },
  {
    tier: "Growth",
    price: "₹999",
    period: "/mo",
    blurb: "AI-assisted entry, the differentiator.",
    features: ["Everything in Starter", "Voice-note → entity parsing", "Photo-of-register bulk import", "AI-drafted message templates", "Smart follow-ups"],
    cta: "Get Growth",
    featured: true,
  },
  {
    tier: "Custom",
    price: "₹2000+",
    period: "/mo",
    blurb: "Branded, integrated.",
    features: ["Everything in Growth", "Custom branding on messages", "Extra custom fields", "Integrations"],
    cta: "Talk to us",
    featured: false,
  },
];

export function MarketingView() {
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-[var(--canvas)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-[var(--brand)]" aria-hidden />
            <span className="text-base sm:text-lg font-medium tracking-tight">Cycle</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("auth")}
              className="rounded-md px-2.5 py-1.5 text-xs sm:text-sm text-[var(--ink-mute)] hover:text-[var(--ink)]"
            >
              Sign in
            </button>
            <button
              onClick={() => setView("auth")}
              className="rounded-md bg-[var(--brand)] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[var(--on-primary)] transition hover:bg-[var(--brand-deep)]"
            >
              Start free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20 pb-12 sm:pb-16 text-center">
        <p className="mb-3 sm:mb-5 text-xs sm:text-sm font-medium uppercase tracking-wide text-[var(--ink-mute)]">
          Membership & lifecycle CRM
        </p>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight sm:tracking-[-0.03em] leading-tight mx-auto max-w-4xl">
          Never miss a renewal again.
        </h1>
        <p className="text-sm sm:text-base md:text-lg mx-auto mt-4 sm:mt-6 max-w-2xl text-[var(--ink-mute)] leading-relaxed">
          One lightweight engine that tracks every client&apos;s active period, package, or contract —
          and sends the right WhatsApp reminder at the right time. Gyms, salons, tuition centers,
          pet daycares, AMC vendors, rentals — all on the same backend.
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row w-full sm:w-auto">
          <button
            onClick={() => setView("auth")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] transition hover:bg-[var(--brand-deep)]"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#dashboard-preview"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-[var(--hairline-strong)] px-5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--canvas-soft)]"
          >
            See the dashboard
          </a>
        </div>

        <p className="caption mt-4 text-[var(--ink-mute-2)]">
          No credit card. Free tier covers your first 20 clients.
        </p>
      </section>

      {/* Product screenshot band — design.md §2.1 "product-UI-as-hero" */}
      <section id="dashboard-preview" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="overflow-hidden rounded-xl border border-[var(--hairline)] shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 border-b border-[var(--hairline)] bg-[var(--canvas-soft)] px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs text-[var(--ink-mute)]">cycle.app — Pulse Fitness Studio</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
            {/* Sidebar */}
            <div className="border-r border-[var(--hairline)] bg-[var(--canvas-soft)] p-4">
              <div className="mb-6 flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full bg-[var(--brand)]" />
                <span className="text-sm font-medium">Pulse Fitness</span>
              </div>
              <nav className="space-y-1 text-sm">
                <div className="nav-active flex items-center gap-2 -ml-px border-l-2 pl-3 py-1.5 text-[var(--ink)]">
                  <Dumbbell className="h-3.5 w-3.5" /> Members
                </div>
                <div className="pl-3 py-1.5 text-[var(--ink-mute)]">Settings</div>
              </nav>
            </div>
            {/* List */}
            <div className="bg-[var(--canvas)] p-6 text-left">
              <div className="mb-4 flex items-center justify-between">
                <span className="heading-md">Members</span>
                <span className="rounded-md bg-[var(--brand)] px-3 py-1 text-xs font-medium text-[var(--on-primary)]">
                  + Add member
                </span>
              </div>
              <ul className="space-y-1.5">
                {[
                  { n: "Ramesh Kumar", p: "3-month membership", d: "10 days left", s: "expiring_soon" },
                  { n: "Priya Sharma", p: "1-month membership", d: "5 days left", s: "expiring_soon" },
                  { n: "Arjun Mehta", p: "12-month membership", d: "185 days left", s: "active" },
                  { n: "Vikram Iyer", p: "1-month membership", d: "Lapsed 2 days ago", s: "lapsed" },
                  { n: "Ananya Nair", p: "3-month membership", d: "80 days left", s: "active" },
                ].map((r) => (
                  <li
                    key={r.n}
                    className="flex items-center justify-between rounded-md border border-[var(--hairline)] bg-[var(--canvas)] px-4 py-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium">{r.n}</div>
                      <div className="caption text-[var(--ink-mute)]">{r.p}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="caption text-[var(--ink-mute)]">{r.d}</span>
                      {r.s === "active" && <span className="status-pill-active">● Active</span>}
                      {r.s === "expiring_soon" && <span className="status-pill-expiring">● Expiring soon</span>}
                      {r.s === "lapsed" && <span className="status-pill-lapsed">● Lapsed</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Vertical showcase — design.md §2.1: "same dashboard, different entity_label" */}
      <section className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <h2 className="display-lg tracking-display-lg">One tool. Many businesses.</h2>
            <p className="body-md mx-auto mt-3 max-w-2xl text-[var(--ink-mute)]">
              The dashboard is identical. Only the labels change. Adding a new vertical
              means adding a config file — never new backend code.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {VERTICAL_TEMPLATES.slice(0, 3).map((v) => {
              const Icon = ICONS[v.icon] ?? Dumbbell;
              return (
                <div
                  key={v.verticalType}
                  className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[var(--ink)]" />
                      <span className="text-sm font-medium">{v.label}</span>
                    </div>
                    <span className="rounded-full bg-[var(--canvas-soft)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--ink-mute)]">
                      {v.cycleType.replace("_", "-")}
                    </span>
                  </div>
                  <p className="caption mb-4 text-[var(--ink-mute)]">{v.blurb}</p>
                  <div className="rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-3">
                    <div className="caption text-[var(--ink-mute)]">entity_label</div>
                    <div className="mt-0.5 text-sm font-mono text-[var(--ink)]">{v.entityLabel}</div>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {v.customFieldSchema.slice(0, 3).map((f) => (
                      <li key={f.key} className="caption flex items-center gap-1.5 text-[var(--ink-mute)]">
                        <span className="inline-block h-1 w-1 rounded-full bg-[var(--ink-faint)]" />
                        <span className="font-mono text-[var(--ink-mute-2)]">{f.key}</span>
                        <span className="text-[var(--ink-faint)]">→</span>
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => setView("auth")}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--canvas)] hover:opacity-90"
            >
              Set up your business <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* AI differentiator band */}
      <section className="border-t border-[var(--hairline)] py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--brand-deep)]">
              The differentiator
            </p>
            <h2 className="display-lg tracking-display-lg">
              Add clients by voice or photo.
              <br />
              Not by form.
            </h2>
            <p className="body-md mt-4 text-[var(--ink-mute)]">
              Owners don&apos;t want to fill forms. They want to talk. Send a voice note
              — <em>&quot;Ramesh, 3-month membership, ₹1500, starts today&quot;</em> — and
              Cycle structures it. Or upload a photo of your handwritten register and bulk-import
              in one click. AI drafts the copy. You just confirm.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--ink-secondary)]">
              {[
                "Voice → structured entity, every time",
                "Photo of register → bulk draft list, exclude misreads with one tap",
                "AI-drafted WhatsApp message templates, editable",
                "Confirm-before-save — no AI output is auto-committed",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas-soft)] p-5">
            <div className="flex gap-2 border-b border-[var(--hairline)] pb-3">
              <span className="rounded-md bg-[var(--brand)] px-3 py-1 text-xs font-medium text-[var(--on-primary)]">
                Voice
              </span>
              <span className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--ink-mute)]">
                Photo
              </span>
              <span className="rounded-md border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--ink-mute)]">
                Manual
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-md border border-dashed border-[var(--hairline-strong)] bg-[var(--canvas)] px-4 py-3">
              <Mic className="h-5 w-5 text-[var(--brand-deep)]" />
              <div className="flex items-end gap-0.5">
                {[6, 14, 8, 22, 16, 10, 18, 24, 12, 6, 14, 20, 10, 6].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-[var(--brand)]"
                    style={{ height: `${h}px`, opacity: i % 3 === 0 ? 0.5 : 0.9 }}
                  />
                ))}
              </div>
              <span className="caption ml-auto text-[var(--ink-mute)]">0:08</span>
            </div>
            <div className="mt-3 rounded-md border border-[var(--hairline)] bg-[var(--canvas)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="caption text-[var(--ink-mute)]">Transcript</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-purple)]/10 px-2 py-0.5 text-[10px] text-[var(--accent-violet)]">
                  AI-suggested
                </span>
              </div>
              <p className="caption text-[var(--ink-secondary)]">
                &quot;Ramesh, 3-month membership, ₹1500, starts today&quot;
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[
                ["Name", "Ramesh Kumar"],
                ["Phone", "+91 98765 43210"],
                ["Plan", "3-month membership"],
                ["Starts", new Date().toISOString().slice(0, 10)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-[var(--hairline)] bg-[var(--canvas)] p-2">
                  <div className="caption text-[var(--ink-mute)]">{k}</div>
                  <input
                    readOnly
                    value={v}
                    className="mt-0.5 w-full bg-transparent text-sm text-[var(--ink)] outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              title="This is a preview — sign up to use the real thing"
              className="mt-3 w-full rounded-md bg-[var(--brand)] py-2 text-sm font-medium text-[var(--on-primary)] cursor-default opacity-90"
            >
              Confirm &amp; save
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <h2 className="display-lg tracking-display-lg">Pricing</h2>
            <p className="body-md mt-3 text-[var(--ink-mute)]">
              Starts at ₹0. Pays for itself with the first saved renewal.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((p) => (
              <div
                key={p.tier}
                className={
                  "flex flex-col rounded-lg border p-6 " +
                  (p.featured
                    ? "border-[var(--canvas-night)] bg-[var(--canvas-night)] text-[var(--on-dark)] shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
                    : "border-[var(--hairline)] bg-[var(--canvas)]")
                }
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{p.tier}</span>
                  {p.featured && (
                    <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-medium text-[var(--on-primary)]">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="display-md">{p.price}</span>
                  <span className={p.featured ? "caption text-white/60" : "caption text-[var(--ink-mute)]"}>
                    {p.period}
                  </span>
                </div>
                <p className={"caption mt-2 " + (p.featured ? "text-white/70" : "text-[var(--ink-mute)]")}>
                  {p.blurb}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={"mt-0.5 h-4 w-4 shrink-0 " + (p.featured ? "text-[var(--brand-soft)]" : "text-[var(--brand)]")} />
                      <span className={p.featured ? "text-white/90" : "text-[var(--ink-secondary)]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setView("auth")}
                  className={
                    "mt-6 rounded-md py-2 text-sm font-medium transition " +
                    (p.featured
                      ? "bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
                      : "border border-[var(--hairline-strong)] text-[var(--ink)] hover:bg-[var(--canvas-soft)]")
                  }
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full bg-[var(--brand)]" aria-hidden />
              <span className="text-sm font-medium">Cycle</span>
              <span className="text-sm text-[var(--ink-mute)]">· Universal Membership &amp; Lifecycle CRM</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--ink-mute)]">
              <a href="/privacy" className="hover:text-[var(--ink)] transition">Privacy Policy</a>
              <a href="/terms" className="hover:text-[var(--ink)] transition">Terms of Service</a>
              <a href="mailto:hello@cyclecrm.app" className="hover:text-[var(--ink)] transition">Contact</a>
            </nav>
          </div>
          <div className="mt-6 border-t border-[var(--hairline)] pt-6 flex flex-col items-center justify-between gap-2 md:flex-row">
            <p className="text-xs text-[var(--ink-mute)]">© {new Date().getFullYear()} Cycle CRM. All rights reserved.</p>
            <p className="text-xs text-[var(--ink-mute-2)]">v0.1 · Pre-release</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
