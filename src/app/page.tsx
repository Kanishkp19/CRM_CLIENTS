"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { MarketingView } from "@/components/cycle/views/marketing";
import { AuthView } from "@/components/cycle/views/auth";
import { OnboardingView } from "@/components/cycle/views/onboarding";
import { DashboardView } from "@/components/cycle/views/dashboard";
import { EntityDetailView } from "@/components/cycle/views/entity-detail";
import { SettingsView } from "@/components/cycle/views/settings";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const isLoadingBusiness = useAppStore((s) => s.isLoadingBusiness);

  // On first mount: check if a business exists for the user in the DB.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/business");
        const json = await res.json();
        if (!cancelled) {
          setBusiness(json.business);
          const currentView = useAppStore.getState().view;
          if (json.business) {
            if (currentView === "marketing" || currentView === "auth") {
              useAppStore.getState().setView("dashboard");
            }
          } else {
            if (currentView !== "onboarding" && currentView !== "auth") {
              useAppStore.getState().setView("marketing");
            }
          }
        }
      } catch {
        if (!cancelled) setBusiness(null);
      }
    })();
    return () => { cancelled = true; };
  }, [setBusiness]);

  if (isLoadingBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-[var(--ink-mute)]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--brand)]" />
          <span className="text-sm">Loading Cycle…</span>
        </div>
      </div>
    );
  }

  // Force marketing view if no business is set yet — except when user is mid-onboarding or in auth view.
  if (!business && view !== "onboarding" && view !== "auth") {
    return <MarketingView />;
  }

  switch (view) {
    case "marketing":
      return <MarketingView />;
    case "auth":
      return (
        <AuthView
          onSuccess={async () => {
            const res = await fetch("/api/business");
            const json = await res.json();
            setBusiness(json.business);
            if (json.business) {
              useAppStore.getState().setView("dashboard");
            } else {
              useAppStore.getState().setView("onboarding");
            }
          }}
        />
      );
    case "onboarding":
      return <OnboardingView />;
    case "dashboard":
      return <DashboardView />;
    case "entity-detail":
      return <EntityDetailView />;
    case "settings":
      return <SettingsView />;
    default:
      return business ? <DashboardView /> : <MarketingView />;
  }
}
