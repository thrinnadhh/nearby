import { Order } from '@/types/admin';
interface OrdersState {
    orders: Order[];
    setOrders: (orders: Order[]) => void;
    updateOrder: (orderId: string, updates: Partial<Order>) => void;
    addOrder: (order: Order) => void;
}
export declare const useOrdersStore: import("zustand").UseBoundStore<import("zustand").StoreApi<OrdersState>>;
export {};
//# sourceMappingURL=ordersStore.d.ts.map