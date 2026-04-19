/**
 * Unit tests for useOrders hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import * as ordersService from '@/services/orders';

jest.mock('@/store/auth');
jest.mock('@/store/orders');
jest.mock('@/services/orders');

const ORDER = {
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
  status: 'pending' as const,
  paymentMode: 'upi' as const,
  createdAt: '2026-04-18T08:00:00Z',
  updatedAt: '2026-04-18T08:00:00Z',
  acceptanceDeadline: '2026-04-18T08:03:00Z',
};

const mockSetOrders = jest.fn();
const mockSetLoading = jest.fn();
const mockSetError = jest.fn();
const mockRemoveOrder = jest.fn();

function makeOrdersStoreMock(overrides = {}) {
  return {
    orders: [],
    loading: false,
    error: null,
    activeOrder: null,
    setOrders: mockSetOrders,
    setLoading: mockSetLoading,
    setError: mockSetError,
    removeOrder: mockRemoveOrder,
    addOrder: jest.fn(),
    setActiveOrder: jest.fn(),
    updateOrderStatus: jest.fn(),
    reset: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockReturnValue('shop-1');
  (useOrdersStore as unknown as jest.Mock).mockReturnValue(makeOrdersStoreMock());
});

describe('fetchOrders', () => {
  it('fetches orders and updates store', async () => {
    (ordersService.getOrders as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: [ORDER],
      meta: { page: 1, total: 1, pages: 1 },
    });

    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(ordersService.getOrders).toHaveBeenCalledWith(1, 20, undefined);
    expect(mockSetOrders).toHaveBeenCalledWith([ORDER]);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('sets error on fetch failure', async () => {
    (ordersService.getOrders as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(mockSetError).toHaveBeenCalledWith('Failed to fetch orders');
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('bails early when shopId is not available', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useOrders());
    await act(async () => {
      await result.current.fetchOrders();
    });

    expect(ordersService.getOrders).not.toHaveBeenCalled();
  });

  it('passes status filter to service', async () => {
    (ordersService.getOrders as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: [],
      meta: { page: 1, total: 0, pages: 0 },
    });

    const { result } = renderHook(() => useOrders());
    await act(async () => {
      await result.current.fetchOrders(1, 'pending');
    });

    expect(ordersService.getOrders).toHaveBeenCalledWith(1, 20, 'pending');
  });
});

describe('fetchOrderDetail', () => {
  it('returns order detail', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValueOnce(ORDER);

    const { result } = renderHook(() => useOrders());
    let order: typeof ORDER | undefined;
    await act(async () => {
      order = await result.current.fetchOrderDetail('order-1');
    });

    expect(order?.id).toBe('order-1');
  });

  it('throws on failure', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockRejectedValueOnce(
      new Error('Not found')
    );

    const { result } = renderHook(() => useOrders());
    await expect(
      act(async () => {
        await result.current.fetchOrderDetail('non-existent');
      })
    ).rejects.toThrow();
  });
});

describe('acceptCurrentOrder', () => {
  it('calls acceptOrder and removes from store', async () => {
    (ordersService.acceptOrder as jest.Mock).mockResolvedValueOnce({
      ...ORDER,
      status: 'accepted',
    });

    const { result } = renderHook(() => useOrders());
    await act(async () => {
      await result.current.acceptCurrentOrder('order-1');
    });

    expect(ordersService.acceptOrder).toHaveBeenCalledWith('order-1');
    expect(mockRemoveOrder).toHaveBeenCalledWith('order-1');
  });

  it('throws on failure without removing from store', async () => {
    (ordersService.acceptOrder as jest.Mock).mockRejectedValueOnce(
      new Error('Failed')
    );

    const { result } = renderHook(() => useOrders());
    await expect(
      act(async () => {
        await result.current.acceptCurrentOrder('order-1');
      })
    ).rejects.toThrow();

    expect(mockRemoveOrder).not.toHaveBeenCalled();
  });
});

describe('rejectCurrentOrder', () => {
  it('calls rejectOrder and removes from store', async () => {
    (ordersService.rejectOrder as jest.Mock).mockResolvedValueOnce({
      ...ORDER,
      status: 'cancelled',
    });

    const { result } = renderHook(() => useOrders());
    await act(async () => {
      await result.current.rejectCurrentOrder('order-1', 'Out of stock');
    });

    expect(ordersService.rejectOrder).toHaveBeenCalledWith('order-1', 'Out of stock');
    expect(mockRemoveOrder).toHaveBeenCalledWith('order-1');
  });
});

describe('retry', () => {
  it('calls fetchOrders again', async () => {
    (ordersService.getOrders as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, total: 0, pages: 0 },
    });

    const { result } = renderHook(() => useOrders());
    await act(async () => {
      await result.current.retry();
    });

    expect(ordersService.getOrders).toHaveBeenCalled();
  });
});
