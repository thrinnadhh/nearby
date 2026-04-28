import { create } from 'zustand';
export const useOrdersStore = create((set) => ({
    orders: [],
    setOrders: (orders) => {
        set({ orders });
    },
    updateOrder: (orderId, updates) => {
        set((state) => ({
            orders: state.orders.map((order) => order.id === orderId ? { ...order, ...updates } : order),
        }));
    },
    addOrder: (order) => {
        set((state) => ({
            orders: [order, ...state.orders],
        }));
    },
}));
//# sourceMappingURL=ordersStore.js.map