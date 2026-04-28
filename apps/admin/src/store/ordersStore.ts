import { create } from 'zustand';
import { Order } from '@/types/admin';

interface OrdersState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  addOrder: (order: Order) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],

  setOrders: (orders: Order[]) => {
    set({ orders });
  },

  updateOrder: (orderId: string, updates: Partial<Order>) => {
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order,
      ),
    }));
  },

  addOrder: (order: Order) => {
    set((state) => ({
      orders: [order, ...state.orders],
    }));
  },
}));
