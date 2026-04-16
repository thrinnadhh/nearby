import { create } from 'zustand';

export interface ShopStatus {
  isOpen: boolean;
  lastUpdated: number;
}

export interface ShopsStore {
  // State: shopId -> status
  statuses: Record<string, ShopStatus>;

  // Actions
  setShopStatus: (shopId: string, isOpen: boolean) => void;
  updateMultipleStatuses: (updates: Record<string, boolean>) => void;
  getShopStatus: (shopId: string) => ShopStatus | undefined;
  clear: () => void;
}

export const useShopsStore = create<ShopsStore>((set, get) => ({
  statuses: {},

  setShopStatus: (shopId, isOpen) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [shopId]: {
          isOpen,
          lastUpdated: Date.now(),
        },
      },
    })),

  updateMultipleStatuses: (updates) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        ...Object.entries(updates).reduce(
          (acc, [shopId, isOpen]) => ({
            ...acc,
            [shopId]: {
              isOpen,
              lastUpdated: Date.now(),
            },
          }),
          {}
        ),
      },
    })),

  getShopStatus: (shopId) => {
    const state = get();
    return state.statuses[shopId];
  },

  clear: () => set({ statuses: {} }),
}));
