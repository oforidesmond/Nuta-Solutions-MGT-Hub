import { create } from "zustand";
import { fetchStaffList, fetchStaffPerformance } from "@/lib/api/staff";
import { handleApiError } from "@/lib/api/errors";
import type { HubStaffMember, StaffPerformanceRow } from "@/lib/types/staff";

interface StaffStoreState {
  members: HubStaffMember[];
  loading: boolean;
  error: string | null;
  performanceRows: StaffPerformanceRow[];
  performanceLoading: boolean;
  performanceError: string | null;
  loadStaff: () => Promise<void>;
  loadPerformance: (query?: { from?: string; to?: string }) => Promise<void>;
  patchMember: (id: string, patch: Partial<HubStaffMember>) => void;
  removeMember: (id: string) => void;
}

export const useStaffStore = create<StaffStoreState>((set, get) => ({
  members: [],
  loading: false,
  error: null,
  performanceRows: [],
  performanceLoading: false,
  performanceError: null,

  loadStaff: async () => {
    set({ loading: true, error: null });
    try {
      const members = await fetchStaffList();
      set({ members, loading: false, error: null });
    } catch (e) {
      set({
        loading: false,
        error: handleApiError(e),
      });
    }
  },

  loadPerformance: async (query) => {
    set({ performanceLoading: true, performanceError: null });
    try {
      const performanceRows = await fetchStaffPerformance(query);
      set({ performanceRows, performanceLoading: false, performanceError: null });
    } catch (e) {
      set({
        performanceLoading: false,
        performanceError: handleApiError(e),
      });
    }
  },

  patchMember: (id, patch) => {
    set({
      members: get().members.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    });
  },

  removeMember: (id) => {
    set({ members: get().members.filter((m) => m.id !== id) });
  },
}));
