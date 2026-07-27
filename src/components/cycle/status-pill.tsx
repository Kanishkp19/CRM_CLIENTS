"use client";

import { cn } from "@/lib/utils";
import type { EntityStatus } from "@/lib/types";

interface Props {
  status: EntityStatus | string;
  className?: string;
}

const LABELS: Record<string, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  lapsed: "Lapsed",
};

// design.md §2.3 — three status pills, color is the ONLY place meaning is carried.
// Lapsed is intentionally the least visually alarming of the three.
export function StatusPill({ status, className }: Props) {
  const cls =
    status === "active"
      ? "status-pill-active"
      : status === "expiring_soon"
        ? "status-pill-expiring"
        : "status-pill-lapsed";
  return (
    <span className={cn(cls, className)}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background:
            status === "active"
              ? "var(--brand)"
              : status === "expiring_soon"
                ? "var(--accent-yellow)"
                : "var(--ink-faint)",
        }}
      />
      {LABELS[status] ?? status}
    </span>
  );
}
