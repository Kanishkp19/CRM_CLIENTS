"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { VERTICAL_TEMPLATES, getVerticalTemplate } from "@/lib/verticals";
import {
  Dumbbell,
  GraduationCap,
  Scissors,
  PawPrint,
  Wrench,
  Package,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const ICONS: Record<string, any> = {
  Dumbbell,
  GraduationCap,
  Scissors,
  PawPrint,
  Wrench,
  Package,
};

export function OnboardingView() {
  const setView = useAppStore((s) => s.setView);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [verticalType, setVerticalType] = useState<string>("gym");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tone, setTone] = useState<"friendly" | "professional" | "casual">("friendly");
  const [submitting, setSubmitting] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  const template = getVerticalTemplate(verticalType) ?? VERTICAL_TEMPLATES[0];

  function goToStep3() {
    if (!ownerName.trim() || !businessName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and business name before continuing.",
        variant: "destructive",
      });
      return;
    }
    setStep(3);
  }

  async function submit() {
    if (!ownerName.trim() || !businessName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and business name.",
        variant: "destructive",
      });
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create business profile with vertical template
      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName: ownerName.trim(), name: businessName.trim(), verticalType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Failed to create business profile (${res.status})`);
      }
      setBusiness(json.business);

      // 2. AI-draft message templates (optional — fail silently to defaults)
      setAiDrafting(true);
      try {
        const draftRes = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tone }),
        });
        const draftJson = await draftRes.json().catch(() => ({}));
        if (draftRes.ok && draftJson.business) {
          setBusiness(draftJson.business);
        }
      } catch {
        // template defaults already applied — safe fallback
      }

      setAiDrafting(false);
      setView("dashboard");
      toast({
        title: `Welcome, ${ownerName.split(" ")[0]}!`,
        description: `${businessName} is ready for action.`,
      });
    } catch (e: any) {
      console.error("Onboarding submission error:", e);
      toast({
        title: "Onboarding failed",
        description: e?.message ?? "Could not setup business profile",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setAiDrafting(false);
    }
  }

  async function tryDemo() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Seed failed (${res.status})`);
      setBusiness(json.business);
      setView("dashboard");
      toast({
        title: json.seeded ? "Demo loaded" : "Existing business found",
        description: json.seeded
          ? "Pulse Fitness Studio with 8 sample members."
          : "Resumed your previous session.",
      });
    } catch (e: any) {
      toast({ title: "Failed to load demo", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Toaster />
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-3.5">
          <button
            onClick={() => setView("marketing")}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--ink-mute)] hover:text-[var(--ink)] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full bg-[var(--brand)]" />
            <span className="text-sm font-medium">Cycle</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Step indicator */}
        <div className="mb-8 sm:mb-10 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {[
            { n: 1, label: "Pick vertical" },
            { n: 2, label: "Business details" },
            { n: 3, label: "AI drafts" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 sm:gap-3">
              <div
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] " +
                  (step >= s.n
                    ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--on-primary)]"
                    : "border-[var(--hairline-strong)] text-[var(--ink-mute)]")
                }
              >
                {step > s.n ? <Check className="h-3 w-3" /> : s.n}
              </div>
              <span className={step >= s.n ? "text-[var(--ink)] font-medium" : "text-[var(--ink-mute)]"}>
                {s.label}
              </span>
              {i < 2 && <span className="h-px w-4 sm:w-8 bg-[var(--hairline)]" />}
            </div>
          ))}
        </div>

        {/* Step 1 — vertical picker */}
        {step === 1 && (
          <div>
            <h2 className="display-lg tracking-display-lg">What kind of business do you run?</h2>
            <p className="body-md mt-2 text-[var(--ink-mute)]">
              This picks default labels, fields, and reminder rules. You can customize later.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VERTICAL_TEMPLATES.map((v) => {
                const Icon = ICONS[v.icon] ?? Dumbbell;
                const selected = verticalType === v.verticalType;
                return (
                  <button
                    key={v.verticalType}
                    onClick={() => setVerticalType(v.verticalType)}
                    className={
                      "text-left rounded-lg border p-5 transition " +
                      (selected
                        ? "border-[var(--brand)] bg-[var(--brand)]/5 shadow-[0_0_0_1px_var(--brand)]"
                        : "border-[var(--hairline)] bg-[var(--canvas)] hover:border-[var(--hairline-strong)]")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-[var(--ink)]" />
                      {selected && <Check className="h-4 w-4 text-[var(--brand-deep)]" />}
                    </div>
                    <h3 className="mt-3 heading-md">{v.label}</h3>
                    <p className="caption mt-1 text-[var(--ink-mute)]">{v.blurb}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="rounded-full bg-[var(--canvas-soft)] px-2 py-0.5 text-[var(--ink-mute)]">
                        entity: <span className="font-mono">{v.entityLabel}</span>
                      </span>
                      <span className="rounded-full bg-[var(--canvas-soft)] px-2 py-0.5 text-[var(--ink-mute)]">
                        cycle: <span className="font-mono">{v.cycleType.replace("_", "-")}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={tryDemo}
                disabled={submitting}
                className="rounded-md border border-[var(--hairline-strong)] px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--canvas-soft)] disabled:opacity-50"
              >
                {submitting ? "Loading…" : "Skip — load demo data"}
              </button>
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — business details */}
        {step === 2 && (
          <div>
            <h2 className="display-lg tracking-display-lg">About your business</h2>
            <p className="body-md mt-2 text-[var(--ink-mute)]">
              Just two fields. The rest is configured automatically from your vertical.
            </p>

            <div className="mt-8 max-w-xl space-y-5">
              <div>
                <label className="caption mb-1 block text-[var(--ink-mute)]">Your name</label>
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Kanishk"
                  className="w-full rounded-md border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="caption mb-1 block text-[var(--ink-mute)]">Business name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Pulse Fitness Studio"
                  className="w-full rounded-md border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>

              <div className="rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-4">
                <div className="caption mb-2 text-[var(--ink-mute)]">Auto-configured from your vertical</div>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-[var(--ink-mute)]">Entity label</span>
                    <span className="font-medium">{template.entityLabel}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--ink-mute)]">Cycle type</span>
                    <span className="font-medium">{template.cycleType.replace("_", "-")}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--ink-mute)]">Default plan</span>
                    <span className="font-medium">{template.defaultPlanName}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-[var(--ink-mute)]">Reminders sent</span>
                    <span className="font-medium">
                      {template.reminderConfig.daysBeforeExpiry.join(", ")} day(s) before
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-sm text-[var(--ink-mute)] hover:text-[var(--ink)]"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={goToStep3}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — AI drafts message templates */}
        {step === 3 && (
          <div>
            <h2 className="display-lg tracking-display-lg">Let AI draft your message templates</h2>
            <p className="body-md mt-2 text-[var(--ink-mute)]">
              Pick a tone. Gemini will draft registration, pre-expiry, expiry-day, and post-expiry
              WhatsApp messages for {template.entityLabel.toLowerCase()}s of {businessName || "your business"}.
              You can edit them later.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {(["friendly", "professional", "casual"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={
                    "rounded-md px-4 py-2 text-sm capitalize transition " +
                    (tone === t
                      ? "bg-[var(--brand)] text-[var(--on-primary)]"
                      : "border border-[var(--hairline-strong)] text-[var(--ink)] hover:bg-[var(--canvas-soft)]")
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-6 max-w-xl rounded-md border border-dashed border-[var(--hairline-strong)] bg-[var(--canvas-soft)] p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-[var(--accent-violet)]" />
                <div>
                  <p className="text-sm text-[var(--ink-secondary)]">
                    After onboarding, you&apos;ll see your dashboard with the AI-drafted templates ready
                    to review in <strong>Settings</strong>. You can also re-draft or edit each one
                    individually.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-sm text-[var(--ink-mute)] hover:text-[var(--ink)]"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--brand-deep)] disabled:opacity-60"
              >
                {submitting
                  ? aiDrafting
                    ? "AI drafting templates…"
                    : "Setting up…"
                  : "Launch my dashboard"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
