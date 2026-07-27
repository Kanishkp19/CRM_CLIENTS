"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Plus, X, Sparkles, Loader2, Save, Lock,
} from "lucide-react";
import type { BusinessDTO, ReminderConfig, MessageTemplates } from "@/lib/types";

export function SettingsView() {
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const setView = useAppStore((s) => s.setView);
  const { toast } = useToast();

  const [reminder, setReminder] = useState<ReminderConfig>(business?.reminderConfig ?? { daysBeforeExpiry: [7, 1], sessionsRemainingThreshold: 2, sendPostExpiry: true });
  const [templates, setTemplates] = useState<MessageTemplates>(business?.messageTemplates ?? { registration: "", preExpiry: "", expiryDay: "", postExpiry: "" });
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [tone, setTone] = useState<"friendly" | "professional" | "casual">("friendly");

  useEffect(() => {
    if (business) {
      setReminder(business.reminderConfig);
      setTemplates(business.messageTemplates);
    }
  }, [business]);

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderConfig: reminder, messageTemplates: templates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      setBusiness(json.business);
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function aiDraft() {
    setDrafting(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      setBusiness(json.business);
      setTemplates(json.business.messageTemplates);
      toast({ title: "AI drafted new templates", description: `Tone: ${tone}` });
    } catch (e: any) {
      toast({ title: "AI drafting failed", description: e?.message, variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  }

  function addDayChip() {
    const next = [...reminder.daysBeforeExpiry, 3].sort((a, b) => a - b);
    setReminder({ ...reminder, daysBeforeExpiry: Array.from(new Set(next)) });
  }

  function removeDay(d: number) {
    setReminder({ ...reminder, daysBeforeExpiry: reminder.daysBeforeExpiry.filter((x) => x !== d) });
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)] bg-[var(--canvas)] px-4 sm:px-6 py-4">
        <button
          onClick={() => setView("dashboard")}
          className="mb-2 inline-flex items-center gap-1 text-xs sm:text-sm text-[var(--ink-mute)] hover:text-[var(--ink)] cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </button>
        <h1 className="text-xl sm:text-2xl font-medium tracking-tight">Business settings</h1>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 py-6">
        {/* Read-only vertical identity — design.md §2.2: "only editable at setup, shown read-only after" */}
        <section className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--ink-mute)]" />
            <h2 className="heading-md">Vertical identity</h2>
          </div>
          <p className="caption mb-4 text-[var(--ink-mute)]">
            Configured at setup. Locked to avoid accidentally breaking your schema.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <ReadonlyRow label="Vertical" value={business?.verticalType ?? ""} />
            <ReadonlyRow label="Entity label" value={business?.entityLabel ?? ""} />
            <ReadonlyRow label="Cycle type" value={business?.cycleType.replace("_", "-") ?? ""} />
            <ReadonlyRow label="Tier" value={business?.tier ?? ""} />
            <ReadonlyRow label="Owner" value={business?.ownerName ?? ""} />
            <ReadonlyRow label="Created" value={business ? new Date(business.createdAt).toLocaleDateString() : ""} />
          </div>
        </section>

        {/* Reminder rules — design.md §2.2: "simple stepper inputs" */}
        <section className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-5">
          <h2 className="heading-md mb-3">Reminder rules</h2>

          <div className="space-y-4">
            <div>
              <Label className="caption text-[var(--ink-mute)]">
                Days before expiry — when to send pre-expiry WhatsApp reminder
              </Label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {reminder.daysBeforeExpiry.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--canvas-soft)] px-3 py-1 text-sm"
                  >
                    {d} day{d === 1 ? "" : "s"}
                    <button onClick={() => removeDay(d)} className="text-[var(--ink-mute)] hover:text-[var(--destructive)]">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={addDayChip}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--hairline-strong)] px-3 py-1 text-xs text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)]"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="caption text-[var(--ink-mute)]">Sessions-remaining threshold (count-based)</Label>
                <Input
                  type="number"
                  value={reminder.sessionsRemainingThreshold}
                  onChange={(e) => setReminder({ ...reminder, sessionsRemainingThreshold: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col">
                <Label className="caption text-[var(--ink-mute)]">Post-expiry follow-up</Label>
                <button
                  type="button"
                  onClick={() => setReminder({ ...reminder, sendPostExpiry: !reminder.sendPostExpiry })}
                  className={
                    "mt-2 flex h-9 w-14 items-center rounded-full px-1 transition " +
                    (reminder.sendPostExpiry ? "bg-[var(--brand)]" : "bg-[var(--hairline-strong)]")
                  }
                >
                  <span
                    className={
                      "h-7 w-7 rounded-full bg-white shadow transition-transform " +
                      (reminder.sendPostExpiry ? "translate-x-5" : "translate-x-0")
                    }
                  />
                </button>
                <p className="caption mt-1 text-[var(--ink-mute-2)]">
                  {reminder.sendPostExpiry ? "On — sends a lapse follow-up after expiry" : "Off"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Message template editor with AI-draft button — design.md §2.2 */}
        <section className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="heading-md">Message templates</h2>
              <p className="caption text-[var(--ink-mute)]">
                Placeholders: <code className="rounded bg-[var(--canvas-soft)] px-1 font-mono">{"{{name}}"}</code>{" "}
                <code className="rounded bg-[var(--canvas-soft)] px-1 font-mono">{"{{business}}"}</code>{" "}
                <code className="rounded bg-[var(--canvas-soft)] px-1 font-mono">{"{{plan}}"}</code>{" "}
                <code className="rounded bg-[var(--canvas-soft)] px-1 font-mono">{"{{days_left}}"}</code>{" "}
                <code className="rounded bg-[var(--canvas-soft)] px-1 font-mono">{"{{units_remaining}}"}</code>{" "}
                <code className="rounded bg-[var(--canvas-soft)] px-1 font-mono">{"{{start_date}}"}</code>{" "}
                <code className="rounded bg-[var(--canvas-soft)] px-1 font-mono">{"{{end_date}}"}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                className="rounded-md border border-[var(--hairline)] bg-[var(--canvas)] px-2 py-1.5 text-sm outline-none focus:border-[var(--brand)]"
              >
                <option value="friendly">friendly</option>
                <option value="professional">professional</option>
                <option value="casual">casual</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={aiDraft}
                disabled={drafting}
                className="border-[var(--accent-violet)] text-[var(--accent-violet)] hover:bg-[var(--accent-purple)]/5"
              >
                {drafting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                AI-draft all
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {([
              ["registration", "Registration confirmation", templates.registration],
              ["preExpiry", "Pre-expiry reminder", templates.preExpiry],
              ["expiryDay", "Expiry-day notice", templates.expiryDay],
              ["postExpiry", "Post-expiry follow-up", templates.postExpiry],
            ] as const).map(([key, label, value]) => (
              <div key={key}>
                <Label className="caption mb-1 block text-[var(--ink-mute)]">{label}</Label>
                <Textarea
                  value={value}
                  onChange={(e) => setTemplates({ ...templates, [key]: e.target.value })}
                  className="min-h-[70px] font-mono text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <p className="caption mr-auto text-[var(--ink-mute)]">Changes apply to all future notifications.</p>
          <Button variant="outline" onClick={() => setView("dashboard")}>Discard</Button>
          <Button
            className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
            onClick={saveAll}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save settings
          </Button>
        </div>
      </main>
    </div>
  );
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-2.5">
      <div className="caption text-[var(--ink-mute)]">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-[var(--ink)]">{value}</div>
    </div>
  );
}

// Keep BusinessDTO referenced for type-only usage if needed.
export type { BusinessDTO };
