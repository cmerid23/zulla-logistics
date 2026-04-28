import { create } from "zustand";
import type { LoadStatus } from "@zulla/shared";

export interface LoadFilterState {
  status?: LoadStatus;
  equipmentType?: string;
  originState?: string;
  destinationState?: string;
  search?: string;
}

interface LoadState {
  filters: LoadFilterState;
  selectedLoadId: string | null;
  setFilters: (patch: Partial<LoadFilterState>) => void;
  resetFilters: () => void;
  selectLoad: (id: string | null) => void;
}

export const useLoadStore = create<LoadState>((set) => ({
  filters: {},
  selectedLoadId: null,
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: {} }),
  selectLoad: (id) => set({ selectedLoadId: id }),
}));
