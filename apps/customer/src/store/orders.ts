import { create } from 'zustand';
import type { Order } from '@/types';

interface OrdersState {
  activeOrder: Order | null;
  /** Most recent orders — populated when history screen loads from API */
  history: Order[];
}

interface OrdersActions {
  setActiveOrder: (order: Order | null) => void;
  addToHistory: (order: Order) => void;
  setHistory: (orders: Order[]) => void;
  clearActive: () => void;
}

export const useOrdersStore = create<OrdersState & OrdersActions>()((set) => ({
  activeOrder: null,
  history: [],

  setActiveOrder: (order) => set({ activeOrder: order }),
  addToHistory: (order) =>
    set((state) => ({ history: [order, ...state.history] })),
  setHistory: (orders) => set({ history: orders }),
  clearActive: () => set({ activeOrder: null }),
}));
