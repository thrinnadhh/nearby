/**
 * Zustand orders store — incoming orders list and active order detail
 * Synced via Socket.IO events from backend
 */

import { create } from 'zustand';
import { Order } from '@/types/orders';
import logger from '@/utils/logger';

interface OrdersState {
  orders: Order[];
  activeOrder: Order | null;
  loading: boolean;
  error: string | null;
}

interface OrdersActions {
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  removeOrder: (orderId: string) => void;
  setActiveOrder: (order: Order | null) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: OrdersState = {
  orders: [],
  activeOrder: null,
  loading: false,
  error: null,
};

export const useOrdersStore = create<OrdersState & OrdersActions>((set) => ({
  ...initialState,

  setOrders: (orders) => {
    logger.info('Orders list updated', { count: orders.length });
    set({ orders });
  },

  addOrder: (order) => {
    logger.info('Order added to list', { orderId: order.id });
    set((state) => ({
      orders: [order, ...state.orders],
    }));
  },

  removeOrder: (orderId) => {
    logger.info('Order removed from list', { orderId });
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
    }));
  },

  setActiveOrder: (order) => {
    logger.info('Active order set', { orderId: order?.id });
    set({ activeOrder: order });
  },

  updateOrderStatus: (orderId, status) => {
    logger.info('Order status updated', { orderId, status });
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: status as Order['status'] } : o
      ),
    }));
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    if (error) {
      logger.error('Orders store error', { error });
    }
    set({ error });
  },

  reset: () => {
    logger.info('Orders store reset');
    set(initialState);
  },
}));
