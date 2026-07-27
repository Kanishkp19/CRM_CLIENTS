"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

// design.md §2.3 — activity-log-panel: dark canvas, mono font, timestamped entries.
// "System-generated" content lives here; owner-entered content lives on white cards.
export function ActivityLogPanel({
  entries,
  className,
  emptyHint = "No activity yet",
}: {
  entries: { sentAt: string; triggerType: string; channel: string; message: string; status: string }[];
  className?: string;
  emptyHint?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className={cn("activity-log-panel text-sm", className)}>
        <span className="log-timestamp">{"// "}{emptyHint}</span>
      </div>
    );
  }

  return (
    <div className={cn("activity-log-panel overflow-x-auto", className)}>
      <ul className="space-y-2">
        {entries.map((e, idx) => (
          <li key={idx} className="leading-relaxed">
            <span className="log-timestamp">[{new Date(e.sentAt).toISOString().replace("T", " ").slice(0, 19)}]</span>{" "}
            <span className="text-[var(--brand-soft)]">[{e.channel}]</span>{" "}
            <span className="text-[var(--ink-faint)]">[{e.triggerType}]</span>{" "}
            <span className="text-white/90">{e.message}</span>
            {e.status === "failed" && (
              <span className="text-[var(--accent-yellow)]"> (failed)</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// design.md §2.3 — ai-review-card: white card + "AI-suggested" pill + inline-editable fields.
// Reinforces that data is unconfirmed (TRD §5 critical safeguard).
export function AiSuggestedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-purple)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent-violet)]">
      <Sparkles className="h-3 w-3" />
      AI-suggested
    </span>
  );
}
