"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { StatusPill } from "@/components/cycle/status-pill";
import { AddEntityModal } from "@/components/cycle/views/add-entity-modal";
import {
  Plus, Search, ChevronDown, Dumbbell, GraduationCap, Scissors, PawPrint, Wrench, Package,
  Settings as SettingsIcon, Users, Sparkles, Loader2, X, RotateCw, Menu, ChevronRight, LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EntityDTO } from "@/lib/types";

const ICONS: Record<string, any> = { Dumbbell, GraduationCap, Scissors, PawPrint, Wrench, Package };

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "lapsed", label: "Lapsed" },
] as const;

const SORTS = [
  { value: "expiry-soon", label: "Expiry soon" },
  { value: "name", label: "Name (A–Z)" },
  { value: "created", label: "Recently added" },
] as const;

export function DashboardView() {
  const business = useAppStore((s) => s.business);
  const openEntity = useAppStore((s) => s.openEntity);
  const openAddEntity = useAppStore((s) => s.openAddEntity);
  const setView = useAppStore((s) => s.setView);
  const signOut = useAppStore((s) => s.signOut);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("expiry-soon");
  const [entities, setEntities] = useState<EntityDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpDataVersion = useAppStore((s) => s.bumpDataVersion);
  const { toast } = useToast();

  async function loadEntities() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    try {
      const res = await fetch(`/api/entities?${params}`);
      if (!res.ok) {
        setEntities([]);
        return;
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : { entities: [] };
      setEntities(json.entities ?? []);
    } catch {
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntities();
  }, [statusFilter, sort, dataVersion]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(loadEntities, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function runDailyScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/reminder-scan", { method: "POST" });
      const json = await res.json();
      toast({
        title: `Daily scan complete — ${json.summary.sent} reminders sent`,
        description: json.summary.lapsed > 0
          ? `${json.summary.lapsed} marked lapsed.`
          : `Scanned ${json.summary.scanned} active cycles.`,
      });
      bumpDataVersion();
    } catch (e: any) {
      toast({ title: "Scan failed", description: e?.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }

  const counts = useMemo(() => {
    const c = { active: 0, expiring_soon: 0, expired: 0, lapsed: 0 };
    for (const e of entities) c[e.status as keyof typeof c] = (c[e.status as keyof typeof c] ?? 0) + 1;
    return c;
  }, [entities]);

  return (
    <div className="flex min-h-screen flex-col md:grid md:grid-cols-[220px_1fr] bg-[var(--canvas)] text-[var(--ink)]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-[var(--hairline)] bg-[var(--canvas-soft)] p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="inline-block h-4 w-4 rounded-full bg-[var(--brand)]" />
          <span className="text-sm font-medium">{business?.name ?? "Cycle"}</span>
        </div>

        <nav className="space-y-1 text-sm">
          <button
            onClick={() => setView("dashboard")}
            className="nav-active flex w-full items-center gap-2 border-l-2 px-3 py-2 text-[var(--ink)]"
          >
            <Users className="h-4 w-4" />
            {business?.entityLabel ?? "Entities"}
          </button>
          <button
            onClick={() => setView("settings")}
            className="flex w-full items-center gap-2 px-3 py-2 text-[var(--ink-mute)] hover:bg-[var(--canvas)] hover:text-[var(--ink)]"
          >
            <SettingsIcon className="h-4 w-4" />
            Settings
          </button>
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-md border border-[var(--hairline)] bg-[var(--canvas)] p-3">
            <div className="caption text-[var(--ink-mute)]">Vertical</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              {(() => {
                const Icon = ICONS[business?.verticalType ?? ""] ?? Dumbbell;
                return <Icon className="h-3.5 w-3.5" />;
              })()}
              <span className="font-medium">{business?.verticalType}</span>
            </div>
          </div>
          <div className="rounded-md border border-[var(--hairline)] bg-[var(--canvas)] p-3">
            <div className="caption text-[var(--ink-mute)]">Tier</div>
            <div className="mt-1 text-sm font-medium capitalize">{business?.tier ?? "free"}</div>
          </div>
          <button
            onClick={signOut}
            className="w-full rounded-md border border-[var(--hairline)] px-3 py-1.5 text-xs text-[var(--ink-mute)] hover:bg-[var(--canvas)] hover:text-[var(--ink)] cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-20 flex md:hidden items-center justify-between border-b border-[var(--hairline)] bg-[var(--canvas)]/90 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-[var(--brand)]" />
          <span className="text-sm font-medium">{business?.name ?? "Cycle"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddEntity("photo" as any)}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--brand)] px-2.5 py-1.5 text-xs font-medium text-[var(--on-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[var(--ink-mute)] hover:text-[var(--ink)] border border-[var(--hairline)] rounded-md"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--hairline)] bg-[var(--canvas-soft)] px-4 py-3 space-y-2">
          <button
            onClick={() => { setView("dashboard"); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--ink)] bg-[var(--canvas)] rounded-md border border-[var(--hairline)]"
          >
            <Users className="h-4 w-4 text-[var(--brand)]" />
            {business?.entityLabel ?? "Entities"}
          </button>
          <button
            onClick={() => { setView("settings"); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-mute)] hover:text-[var(--ink)]"
          >
            <SettingsIcon className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => { runDailyScan(); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--ink-mute)] hover:text-[var(--ink)]"
          >
            <RotateCw className="h-4 w-4" />
            Run daily scan
          </button>
          <button
            onClick={() => { signOut(); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-col flex-1">
        {/* Desktop Top bar / Mobile Title bar */}
        <header className="border-b border-[var(--hairline)] bg-[var(--canvas)] px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight">{business?.entityLabel ?? "Entities"}</h1>
              <p className="caption text-[var(--ink-mute)]">
                {business?.name} · {business?.verticalType} · {business?.cycleType.replace("_", "-")}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={runDailyScan}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--hairline-strong)] px-3 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--canvas-soft)] disabled:opacity-50"
                title="Manually trigger the daily reminder scan"
              >
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                Run daily scan
              </button>
              <button
                onClick={() => openAddEntity("photo" as any)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--brand-deep)]"
              >
                <Plus className="h-4 w-4" />
                Add {business?.entityLabel.toLowerCase()}
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            <StatCard label="Active" value={counts.active} dotColor="var(--brand)" />
            <StatCard label="Expiring soon" value={counts.expiring_soon} dotColor="var(--accent-yellow)" />
            <StatCard label="Expired" value={counts.expired} dotColor="var(--ink-faint)" />
            <StatCard label="Lapsed" value={counts.lapsed} dotColor="var(--ink-faint)" />
          </div>
        </header>

        {/* Filter & Search Bar */}
        <div className="border-b border-[var(--hairline)] bg-[var(--canvas)] px-4 sm:px-6 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Scrollable chip filters on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {STATUS_FILTERS.map((f) => {
                const isActive = statusFilter === f.value;
                return (
                  <button
                    key={f.value || "all"}
                    onClick={() => setStatusFilter(f.value)}
                    className={
                      "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition shrink-0 " +
                      (isActive
                        ? "bg-[var(--brand)] text-[var(--on-primary)]"
                        : "border border-[var(--hairline)] text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)]")
                    }
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-mute)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-md border border-[var(--hairline)] bg-[var(--canvas)] py-1.5 pl-8 pr-7 text-sm outline-none focus:border-[var(--brand)]"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-mute)] hover:text-[var(--ink)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="relative shrink-0">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-md border border-[var(--hairline)] bg-[var(--canvas)] py-1.5 pl-3 pr-7 text-xs sm:text-sm outline-none focus:border-[var(--brand)]"
                >
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--ink-mute)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Entity list area */}
        <div className="flex-1 overflow-y-auto bg-[var(--canvas)] px-4 sm:px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[var(--ink-mute)]">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading entities…
            </div>
          ) : entities.length === 0 ? (
            <EmptyState
              entityLabel={business?.entityLabel ?? "entity"}
              onAddManual={() => openAddEntity("manual")}
              onAddVoice={() => openAddEntity("voice")}
            />
          ) : (
            <EntityList entities={entities} onOpen={openEntity} />
          )}
        </div>
      </main>

      <AddEntityModal />
    </div>
  );
}

function StatCard({ label, value, dotColor }: { label: string; value: number; dotColor: string }) {
  return (
    <div className="rounded-md border border-[var(--hairline)] bg-[var(--canvas)] px-2.5 sm:px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="caption truncate text-[var(--ink-mute)] text-[11px] sm:text-xs">{label}</span>
      </div>
      <div className="mt-0.5 text-lg sm:text-xl font-medium">{value}</div>
    </div>
  );
}

function EntityList({ entities, onOpen }: { entities: EntityDTO[]; onOpen: (id: string) => void }) {
  return (
    <div>
      {/* Desktop Grid Header & Table */}
      <ul className="hidden md:block divide-y divide-[var(--hairline)] rounded-md border border-[var(--hairline)] bg-[var(--canvas)]">
        <li className="grid grid-cols-[1fr_140px_120px_120px] gap-3 px-4 py-2 text-xs uppercase tracking-wide text-[var(--ink-mute)]">
          <div>Name</div>
          <div>Plan</div>
          <div>Days / sessions</div>
          <div>Status</div>
        </li>
        {entities.map((e) => {
          const cycle = e.cycles[0];
          const daysLeft = cycle?.endDate
            ? Math.round((new Date(cycle.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          return (
            <li
              key={e.id}
              onClick={() => onOpen(e.id)}
              className="grid cursor-pointer grid-cols-[1fr_140px_120px_120px] items-center gap-3 px-4 py-3 hover:bg-[var(--canvas-soft)] transition"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--ink)]">{e.name}</div>
                <div className="caption truncate text-[var(--ink-mute)]">{e.phone}</div>
              </div>
              <div className="truncate text-sm text-[var(--ink-secondary)]">{cycle?.planName ?? "—"}</div>
              <div className="text-sm text-[var(--ink-mute)]">
                {cycle?.unitsRemaining != null
                  ? `${cycle.unitsRemaining} sessions`
                  : daysLeft != null
                    ? daysLeft >= 0
                      ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                      : `${-daysLeft} day${daysLeft === -1 ? "" : "s"} ago`
                    : "—"}
              </div>
              <div>
                <StatusPill status={e.status} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Mobile Card List Layout */}
      <div className="block md:hidden space-y-2.5">
        {entities.map((e) => {
          const cycle = e.cycles[0];
          const daysLeft = cycle?.endDate
            ? Math.round((new Date(cycle.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          return (
            <div
              key={e.id}
              onClick={() => onOpen(e.id)}
              className="rounded-lg border border-[var(--hairline)] bg-[var(--canvas)] p-3.5 active:bg-[var(--canvas-soft)] cursor-pointer transition shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-[var(--ink)] truncate max-w-[200px]">{e.name}</span>
                <StatusPill status={e.status} />
              </div>
              
              <div className="flex items-center justify-between text-xs text-[var(--ink-mute)] pt-2 border-t border-[var(--hairline)]/50">
                <span className="truncate max-w-[150px] font-medium text-[var(--ink-secondary)]">{cycle?.planName ?? "No active plan"}</span>
                <div className="flex items-center gap-1 font-mono">
                  <span>
                    {cycle?.unitsRemaining != null
                      ? `${cycle.unitsRemaining} sess.`
                      : daysLeft != null
                        ? daysLeft >= 0 ? `${daysLeft}d left` : `${-daysLeft}d ago`
                        : "—"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#9a9a9a]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({
  entityLabel, onAddManual, onAddVoice,
}: { entityLabel: string; onAddManual: () => void; onAddVoice: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--canvas-soft)]">
        <Users className="h-5 w-5 text-[var(--ink-mute)]" />
      </div>
      <h3 className="text-xl font-medium tracking-tight">No {entityLabel.toLowerCase()}s yet</h3>
      <p className="text-xs sm:text-sm mt-2 max-w-md text-[var(--ink-mute)]">
        Add your first {entityLabel.toLowerCase()} manually, or use Gemini AI to parse text or
        a photo of your existing register.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 w-full sm:w-auto sm:flex-row">
        <button
          onClick={onAddVoice}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:bg-[var(--brand-deep)] w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          Add via AI or photo
        </button>
        <button
          onClick={onAddManual}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--hairline-strong)] px-5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--canvas-soft)] w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add manually
        </button>
      </div>
    </div>
  );
}
