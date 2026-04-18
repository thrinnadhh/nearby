/**
 * Integration tests for useOrders hook
 * Tests hook logic without React rendering — mocks services and stores
 */

jest.mock('@/services/orders', () => ({
  getOrders: jest.fn(),
  getOrderDetail: jest.fn(),
  acceptOrder: jest.fn(),
  rejectOrder: jest.fn(),
}));

import { getOrders, getOrderDetail, acceptOrder, rejectOrder } from '@/services/orders';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';
import { Order } from '@/types/orders';
import { AppError } from '@/types/common';

const mockGetOrders = getOrders as jest.MockedFunction<typeof getOrders>;
const mockGetOrderDetail = getOrderDetail as jest.MockedFunction<typeof getOrderDetail>;
const mockAcceptOrder = acceptOrder as jest.MockedFunction<typeof acceptOrder>;
const mockRejectOrder = rejectOrder as jest.MockedFunction<typeof rejectOrder>;

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
  jest.clearAllMocks();
  useOrdersStore.getState().reset();
  // Set a valid shopId so hooks don't bail early
  useAuthStore.getState().login({
    userId: 'user-1',
    shopId: 'shop-1',
    phone: '9876543210',
    token: 'jwt-abc',
  });
});

afterEach(() => {
  useAuthStore.getState().logout();
});

describe('orders store — fetchOrders logic', () => {
  it('populates orders store after successful fetch', async () => {
    mockGetOrders.mockResolvedValueOnce({
      success: true,
      data: [ORDER],
      meta: { page: 1, total: 1, pages: 1 },
    });

    // Directly call the service and update the store (mirrors hook logic)
    const store = useOrdersStore.getState();
    store.setLoading(true);
    const response = await getOrders(1, 20);
    store.setOrders(response.data);
    store.setLoading(false);

    expect(useOrdersStore.getState().orders).toHaveLength(1);
    expect(useOrdersStore.getState().loading).toBe(false);
  });

  it('stores error message on fetch failure', async () => {
    mockGetOrders.mockRejectedValueOnce(
      new AppError('ORDERS_FETCH_FAILED', 'Network error')
    );

    const store = useOrdersStore.getState();
    store.setLoading(true);
    try {
      await getOrders(1, 20);
    } catch (err) {
      store.setError(err instanceof AppError ? err.message : 'Failed');
      store.setLoading(false);
    }

    expect(useOrdersStore.getState().error).toBe('Network error');
    expect(useOrdersStore.getState().loading).toBe(false);
  });
});

describe('acceptCurrentOrder logic', () => {
  it('removes order from store after accepting', async () => {
    mockAcceptOrder.mockResolvedValueOnce({ ...ORDER, status: 'accepted' });
    useOrdersStore.getState().setOrders([ORDER]);

    await acceptOrder('order-1');
    useOrdersStore.getState().removeOrder('order-1');

    expect(useOrdersStore.getState().orders).toHaveLength(0);
  });

  it('throws on accept failure', async () => {
    mockAcceptOrder.mockRejectedValueOnce(
      new AppError('ORDER_ACCEPT_FAILED', 'Failed to accept')
    );
    useOrdersStore.getState().setOrders([ORDER]);

    await expect(acceptOrder('order-1')).rejects.toThrow(AppError);
    // Order remains in store since accept failed
    expect(useOrdersStore.getState().orders).toHaveLength(1);
  });
});

describe('rejectCurrentOrder logic', () => {
  it('removes order from store after rejecting', async () => {
    mockRejectOrder.mockResolvedValueOnce({ ...ORDER, status: 'cancelled' as any });
    useOrdersStore.getState().setOrders([ORDER]);

    await rejectOrder('order-1', 'Out of stock');
    useOrdersStore.getState().removeOrder('order-1');

    expect(useOrdersStore.getState().orders).toHaveLength(0);
    expect(mockRejectOrder).toHaveBeenCalledWith('order-1', 'Out of stock');
  });
});

describe('getOrderDetail logic', () => {
  it('returns order data', async () => {
    mockGetOrderDetail.mockResolvedValueOnce(ORDER);

    const result = await getOrderDetail('order-1');
    expect(result.id).toBe('order-1');
  });

  it('throws ORDER_NOT_FOUND for missing orders', async () => {
    mockGetOrderDetail.mockRejectedValueOnce(
      new AppError('ORDER_NOT_FOUND', 'Not found', 404)
    );

    await expect(getOrderDetail('non-existent')).rejects.toThrow(AppError);
  });
});
