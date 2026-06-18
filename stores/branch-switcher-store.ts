import { create } from "zustand";

interface BranchSwitcherState {
  openRequested: boolean;
  requestOpen: () => void;
  consumeOpenRequest: () => boolean;
}

export const useBranchSwitcherStore = create<BranchSwitcherState>((set, get) => ({
  openRequested: false,

  requestOpen: () => set({ openRequested: true }),

  consumeOpenRequest: () => {
    if (!get().openRequested) return false;
    set({ openRequested: false });
    return true;
  },
}));
