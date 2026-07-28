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

  // Helper to fetch current user's business profile
  async function fetchUserBusiness() {
    try {
      const res = await fetch("/api/business");
      const json = await res.json().catch(() => ({}));
      return json.business ?? null;
    } catch {
      return null;
    }
  }

  // On first mount: check if a business exists for the user in the DB.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = await fetchUserBusiness();
      if (!cancelled) {
        setBusiness(b);
        const currentView = useAppStore.getState().view;
        if (b) {
          if (currentView === "marketing" || currentView === "auth" || currentView === "onboarding") {
            useAppStore.getState().setView("dashboard");
          }
        } else {
          if (currentView !== "onboarding" && currentView !== "auth") {
            useAppStore.getState().setView("marketing");
          }
        }
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
            // Small delay to allow Supabase SSR cookies to sync
            await new Promise((r) => setTimeout(r, 200));
            let b = await fetchUserBusiness();
            if (!b) {
              // Retry once to ensure cookie propagation
              await new Promise((r) => setTimeout(r, 400));
              b = await fetchUserBusiness();
            }
            setBusiness(b);
            if (b) {
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
