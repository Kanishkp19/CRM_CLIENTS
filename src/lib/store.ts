"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { BusinessDTO, EntityDTO } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export type AppView =
  | "marketing"
  | "auth"
  | "onboarding"
  | "dashboard"
  | "entity-detail"
  | "settings";

interface AppState {
  // view routing
  view: AppView;
  selectedEntityId: string | null;
  addEntityModalOpen: boolean;
  addEntityDefaultTab: "voice" | "photo" | "doc" | "manual";

  // cached data
  business: BusinessDTO | null;
  entities: EntityDTO[];
  isLoadingBusiness: boolean;
  isLoadingEntities: boolean;
  dataVersion: number;

  // actions
  setView: (v: AppView) => void;
  openEntity: (id: string) => void;
  closeEntity: () => void;
  openAddEntity: (tab?: "voice" | "photo" | "doc" | "manual") => void;
  closeAddEntity: () => void;

  setBusiness: (b: BusinessDTO | null) => void;
  setEntities: (e: EntityDTO[]) => void;
  upsertEntity: (e: EntityDTO) => void;
  removeEntity: (id: string) => void;
  setLoadingBusiness: (b: boolean) => void;
  setLoadingEntities: (b: boolean) => void;
  bumpDataVersion: () => void;
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: "marketing",
      selectedEntityId: null,
      addEntityModalOpen: false,
      addEntityDefaultTab: "voice",

      business: null,
      entities: [],
      isLoadingBusiness: true,
      isLoadingEntities: false,
      dataVersion: 0,

      setView: (v) => set({ view: v }),
      openEntity: (id) => set({ view: "entity-detail", selectedEntityId: id, addEntityModalOpen: false }),
      closeEntity: () => set({ view: "dashboard", selectedEntityId: null }),
      openAddEntity: (tab = "voice") => set({ addEntityModalOpen: true, addEntityDefaultTab: tab }),
      closeAddEntity: () => set({ addEntityModalOpen: false }),

      setBusiness: (b) => set({ business: b, isLoadingBusiness: false }),
      setEntities: (e) => set({ entities: e, isLoadingEntities: false }),
      upsertEntity: (e) =>
        set((s) => {
          const idx = s.entities.findIndex((x) => x.id === e.id);
          if (idx >= 0) {
            const next = [...s.entities];
            next[idx] = e;
            return { entities: next, dataVersion: s.dataVersion + 1 };
          }
          return { entities: [e, ...s.entities], dataVersion: s.dataVersion + 1 };
        }),
      removeEntity: (id) =>
        set((s) => ({
          entities: s.entities.filter((e) => e.id !== id),
          selectedEntityId: s.selectedEntityId === id ? null : s.selectedEntityId,
          view: s.selectedEntityId === id ? "dashboard" : s.view,
          dataVersion: s.dataVersion + 1,
        })),
      setLoadingBusiness: (b) => set({ isLoadingBusiness: b }),
      setLoadingEntities: (b) => set({ isLoadingEntities: b }),
      bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
      signOut: async () => {
        try {
          const supabase = createClient();
          await supabase.auth.signOut({ scope: "local" });
        } catch (err) {
          // ignore unauthenticated local sign out
        }
        if (typeof window !== "undefined") {
          localStorage.removeItem("cycle_crm_store");
        }
        set({
          view: "marketing",
          business: null,
          entities: [],
          selectedEntityId: null,
          addEntityModalOpen: false,
          isLoadingBusiness: false,
        });
      },
    }),
    {
      name: "cycle_crm_store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        view: state.view === "auth" ? "marketing" : state.view,
        selectedEntityId: state.selectedEntityId,
        business: state.business,
      }),
    }
  )
);
