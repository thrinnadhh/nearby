/**
 * Unit tests for orders Zustand store
 */

import { useOrdersStore } from '@/store/orders';
import { Order } from '@/types/orders';

const ORDER: Order = {
  id: 'order-1',
  shopId: 'shop-1',
  customerId: 'cust-1',
  customerName: 'Test User',
  customerPhone: '9876543210',
  deliveryAddress: '123 Main St',
  items: [],
  subtotal: 10000,
  deliveryFee: 2500,
  total: 12500,
  status: 'pending',
  paymentMode: 'upi',
  createdAt: '2026-04-18T08:00:00Z',
  updatedAt: '2026-04-18T08:00:00Z',
  acceptanceDeadline: '2026-04-18T08:03:00Z',
};

beforeEach(() => {
  useOrdersStore.getState().reset();
});

describe('setOrders', () => {
  it('replaces the orders list', () => {
    useOrdersStore.getState().setOrders([ORDER]);
    expect(useOrdersStore.getState().orders).toHaveLength(1);
    expect(useOrdersStore.getState().orders[0].id).toBe('order-1');
  });
});

describe('addOrder', () => {
  it('prepends new order to list', () => {
    const order2 = { ...ORDER, id: 'order-2' };
    useOrdersStore.getState().setOrders([ORDER]);
    useOrdersStore.getState().addOrder(order2);

    const orders = useOrdersStore.getState().orders;
    expect(orders[0].id).toBe('order-2');
    expect(orders[1].id).toBe('order-1');
  });
});

describe('removeOrder', () => {
  it('removes order by id', () => {
    useOrdersStore.getState().setOrders([ORDER, { ...ORDER, id: 'order-2' }]);
    useOrdersStore.getState().removeOrder('order-1');

    const orders = useOrdersStore.getState().orders;
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe('order-2');
  });

  it('is a no-op when orderId not found', () => {
    useOrdersStore.getState().setOrders([ORDER]);
    useOrdersStore.getState().removeOrder('non-existent');
    expect(useOrdersStore.getState().orders).toHaveLength(1);
  });
});

describe('setActiveOrder', () => {
  it('sets and clears active order', () => {
    useOrdersStore.getState().setActiveOrder(ORDER);
    expect(useOrdersStore.getState().activeOrder?.id).toBe('order-1');

    useOrdersStore.getState().setActiveOrder(null);
    expect(useOrdersStore.getState().activeOrder).toBeNull();
  });
});

describe('updateOrderStatus', () => {
  it('updates status of matching order', () => {
    useOrdersStore.getState().setOrders([ORDER]);
    useOrdersStore.getState().updateOrderStatus('order-1', 'accepted');

    expect(useOrdersStore.getState().orders[0].status).toBe('accepted');
  });

  it('leaves other orders unchanged', () => {
    const order2 = { ...ORDER, id: 'order-2', status: 'pending' as const };
    useOrdersStore.getState().setOrders([ORDER, order2]);
    useOrdersStore.getState().updateOrderStatus('order-1', 'accepted');

    expect(useOrdersStore.getState().orders[1].status).toBe('pending');
  });

  it('is a no-op when orderId not found', () => {
    useOrdersStore.getState().setOrders([ORDER]);
    useOrdersStore.getState().updateOrderStatus('non-existent', 'accepted');
    expect(useOrdersStore.getState().orders[0].status).toBe('pending');
  });
});

describe('setLoading / setError', () => {
  it('sets loading state', () => {
    useOrdersStore.getState().setLoading(true);
    expect(useOrdersStore.getState().loading).toBe(true);

    useOrdersStore.getState().setLoading(false);
    expect(useOrdersStore.getState().loading).toBe(false);
  });

  it('sets and clears error', () => {
    useOrdersStore.getState().setError('Something failed');
    expect(useOrdersStore.getState().error).toBe('Something failed');

    useOrdersStore.getState().setError(null);
    expect(useOrdersStore.getState().error).toBeNull();
  });
});

describe('reset', () => {
  it('clears all state to initial values', () => {
    useOrdersStore.getState().setOrders([ORDER]);
    useOrdersStore.getState().setLoading(true);
    useOrdersStore.getState().setError('error');
    useOrdersStore.getState().reset();

    const state = useOrdersStore.getState();
    expect(state.orders).toHaveLength(0);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.activeOrder).toBeNull();
  });
});
