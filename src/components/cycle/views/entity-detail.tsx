"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { StatusPill } from "@/components/cycle/status-pill";
import { ActivityLogPanel } from "@/components/cycle/activity-log-panel";
import {
  ArrowLeft, RefreshCw, Send, Pencil, Trash2, Loader2, Calendar, CreditCard, X, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EntityDTO } from "@/lib/types";

export function EntityDetailView() {
  const selectedId = useAppStore((s) => s.selectedEntityId);
  const closeEntity = useAppStore((s) => s.closeEntity);
  const upsertEntity = useAppStore((s) => s.upsertEntity);
  const removeEntity = useAppStore((s) => s.removeEntity);
  const business = useAppStore((s) => s.business);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);
  const { toast } = useToast();

  const [entity, setEntity] = useState<EntityDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewOpen, setRenewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch("/api/entities")
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        if (!text) return [];
        try { return JSON.parse(text).entities ?? []; } catch { return []; }
      })
      .then((list: EntityDTO[]) => list.find((e) => e.id === selectedId) ?? null)
      .then((found) => setEntity(found))
      .finally(() => setLoading(false));
  }, [selectedId, dataVersion]);

  async function refreshEntity() {
    if (!selectedId) return;
    const r = await fetch("/api/entities");
    const j = await r.json();
    const found = (j.entities as EntityDTO[]).find((e) => e.id === selectedId) ?? null;
    setEntity(found);
    if (found) upsertEntity(found);
  }

  async function sendReminder() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/entities/${selectedId}/send-reminder`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      setEntity(json.entity);
      upsertEntity(json.entity);
      bumpDataVersion();
      toast({ title: "Reminder sent", description: `WhatsApp ${json.notification.triggerType.replace("_", " ")} to ${entity?.name}.` });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function decrementSession() {
    const cycle = entity?.cycles[0];
    if (!cycle) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cycles/${cycle.id}/decrement`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      bumpDataVersion();
      toast({ title: "Session used", description: `${json.cycle.unitsRemaining} session(s) remaining.` });
      await refreshEntity();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntity() {
    if (!selectedId) return;
    setBusy(true);
    try {
      await fetch(`/api/entities/${selectedId}`, { method: "DELETE" });
      removeEntity(selectedId);
      bumpDataVersion();
      toast({ title: `${entity?.name} deleted` });
      closeEntity();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--ink-mute)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-[var(--ink-mute)]">Entity not found.</p>
        <Button className="mt-4" onClick={closeEntity}>Back</Button>
      </div>
    );
  }

  const latestCycle = entity.cycles[0];
  const isCountBased = business?.cycleType === "count_based" || business?.cycleType === "both";

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      {/* Top bar */}
      <header className="border-b border-[var(--hairline)] bg-[var(--canvas)] px-4 sm:px-6 py-4">
        <button
          onClick={closeEntity}
          className="mb-3 inline-flex items-center gap-1 text-xs sm:text-sm text-[var(--ink-mute)] hover:text-[var(--ink)] cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {business?.entityLabel.toLowerCase()}s
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight">{entity.name}</h1>
            <StatusPill status={entity.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isCountBased && (
              <Button
                variant="outline"
                size="sm"
                onClick={decrementSession}
                disabled={busy || latestCycle?.unitsRemaining === 0}
                className="text-xs sm:text-sm"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Use 1 session
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={busy} className="text-xs sm:text-sm">
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={sendReminder} disabled={busy} className="text-xs sm:text-sm">
              <Send className="h-3.5 w-3.5 mr-1" /> Send reminder
            </Button>
            <Button
              size="sm"
              className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)] text-xs sm:text-sm font-medium"
              onClick={() => setRenewOpen(true)}
              disabled={busy}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Renew
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={deleteEntity}
              disabled={busy}
              className="text-[var(--ink-mute)] hover:text-[var(--destructive)] text-xs sm:text-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 sm:px-6 py-6 md:grid-cols-[1fr_360px]">
        {/* Left: cycle history timeline + entity info */}
        <div className="space-y-6">
          {/* Contact / details */}
          <section className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-5">
            <h2 className="heading-md mb-3">Details</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="caption text-[var(--ink-mute)]">Phone</dt>
                <dd className="mt-0.5 font-mono">{entity.phone || "—"}</dd>
              </div>
              <div>
                <dt className="caption text-[var(--ink-mute)]">Email</dt>
                <dd className="mt-0.5 font-mono">{entity.email || "—"}</dd>
              </div>
              {business?.customFieldSchema.map((f) => (
                <div key={f.key}>
                  <dt className="caption text-[var(--ink-mute)]">{f.label}</dt>
                  <dd className="mt-0.5">{entity.customFields[f.key] || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Cycle history as a vertical timeline (design.md §2.2) */}
          <section className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-5">
            <h2 className="heading-md mb-4">Cycle history</h2>
            {entity.cycles.length === 0 ? (
              <p className="caption text-[var(--ink-mute)]">No cycles yet.</p>
            ) : (
              <ol className="relative ml-2 border-l-2 border-[var(--hairline)]">
                {entity.cycles.map((c, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <li key={c.id} className="mb-6 ml-4 last:mb-0">
                      <span
                        className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-[var(--canvas)]"
                        style={{
                          background: c.status === "active" ? "var(--brand)" : c.status === "renewed" ? "var(--ink-mute)" : "var(--ink-faint)",
                        }}
                      />
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-sm font-medium">{c.planName}</div>
                          <div className="caption text-[var(--ink-mute)]">
                            <Calendar className="mr-1 inline h-3 w-3" />
                            {new Date(c.startDate).toLocaleDateString()}
                            {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={
                            "rounded-full px-2 py-0.5 text-[10px] font-medium " +
                            (c.status === "active"
                              ? "bg-[var(--brand)]/15 text-[var(--brand-deep)]"
                              : c.status === "renewed"
                                ? "bg-[var(--canvas-soft)] text-[var(--ink-mute)]"
                                : "bg-[var(--ink-faint)]/20 text-[var(--ink-mute)]")
                          }>
                            {c.status}
                          </span>
                          {c.amount != null && (
                            <div className="caption mt-1 flex items-center justify-end gap-1 text-[var(--ink-mute)]">
                              <CreditCard className="h-3 w-3" /> ₹{c.amount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 caption text-[var(--ink-mute-2)]">
                        {c.unitsRemaining != null
                          ? `${c.unitsRemaining} / ${c.unitsTotal} sessions remaining`
                          : isLatest
                            ? `Created ${new Date(c.createdAt).toLocaleDateString()}`
                            : `Archived ${new Date(c.createdAt).toLocaleDateString()}`}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* Right: dark notification log — design.md §2.2 + §2.3 "system log feel" */}
        <section>
          <h2 className="heading-md mb-3">Notification log</h2>
          <ActivityLogPanel
            entries={entity.notifications}
            emptyHint="No notifications sent yet — try 'Send reminder now'."
            className="max-h-[600px] overflow-y-auto"
          />
          <p className="caption mt-2 text-[var(--ink-mute-2)]">
            All outbound WhatsApp / email activity for this {business?.entityLabel.toLowerCase()}.
            Dark panel = system-generated.
          </p>
        </section>
      </main>

      {/* Renew modal */}
      <RenewModal
        open={renewOpen}
        onOpenChange={setRenewOpen}
        onDone={async () => {
          await refreshEntity();
          setRenewOpen(false);
        }}
        entityId={entity.id}
        currentPlanName={latestCycle?.planName ?? ""}
      />

      {/* Edit modal */}
      <EditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        entity={entity}
        onSaved={async () => {
          await refreshEntity();
          setEditOpen(false);
        }}
      />
    </div>
  );
}

function RenewModal({
  open, onOpenChange, onDone, entityId, currentPlanName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
  entityId: string;
  currentPlanName: string;
}) {
  const { toast } = useToast();
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);
  const [planName, setPlanName] = useState(currentPlanName);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPlanName(currentPlanName); }, [currentPlanName, open]);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/entities/${entityId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName, startDate,
          endDate: endDate || undefined,
          amount: amount ? Number(amount) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      bumpDataVersion();
      toast({ title: "Renewal recorded", description: "New cycle created, old one archived." });
      onDone();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as renewed</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="caption text-[var(--ink-mute)]">Plan name</Label>
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </div>
          <div>
            <Label className="caption text-[var(--ink-mute)]">New start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="caption text-[var(--ink-mute)]">New end date (leave blank to copy duration)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label className="caption text-[var(--ink-mute)]">Amount (₹)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)]" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Confirm renewal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditModal({
  open, onOpenChange, entity, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity: EntityDTO;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);
  const [name, setName] = useState(entity.name);
  const [phone, setPhone] = useState(entity.phone);
  const [email, setEmail] = useState(entity.email ?? "");
  const [customFields, setCustomFields] = useState<Record<string, string>>(entity.customFields);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(entity.name);
    setPhone(entity.phone);
    setEmail(entity.email ?? "");
    setCustomFields(entity.customFields);
  }, [entity, open]);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/entities/${entity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, customFields }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      bumpDataVersion();
      toast({ title: "Saved" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {entity.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="caption text-[var(--ink-mute)]">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="caption text-[var(--ink-mute)]">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label className="caption text-[var(--ink-mute)]">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {useAppStore.getState().business?.customFieldSchema.map((f) => (
            <div key={f.key}>
              <Label className="caption text-[var(--ink-mute)]">{f.label}</Label>
              {f.type === "select" ? (
                <select
                  value={customFields[f.key] ?? ""}
                  onChange={(e) => setCustomFields({ ...customFields, [f.key]: e.target.value })}
                  className="w-full rounded-md border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                >
                  <option value="">—</option>
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <Input
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={customFields[f.key] ?? ""}
                  onChange={(e) => setCustomFields({ ...customFields, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-[var(--brand)] text-[var(--on-primary)] hover:bg-[var(--brand-deep)]" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tiny export to avoid unused import in some builds.
void X;
