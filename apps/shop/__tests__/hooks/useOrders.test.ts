/**
 * Unit tests for useOrders hook
 * Tests order fetching, filtering, and accept/reject operations
 */

import { renderHook, act } from '@testing-library/react-native';
import { useOrders } from '@/hooks/useOrders';
import * as ordersService from '@/services/orders';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';

jest.mock('@/services/orders');
jest.mock('@/store/orders');
jest.mock('@/store/auth');

const mockService = ordersService as jest.Mocked<typeof ordersService>;

const mockOrder = {
  id: 'order-123',
  shopId: 'shop-123',
  customerId: 'customer-123',
  customerName: 'John Doe',
  customerPhone: '9876543210',
  deliveryAddress: '123 Main St',
  items: [{ productId: 'p1', name: 'Product 1', qty: 2, subtotal: 500 }],
  subtotal: 500,
  deliveryFee: 25,
  total: 525,
  status: 'pending' as const,
  paymentMode: 'upi' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  acceptanceDeadline: new Date(
    Date.now() + 3 * 60 * 1000
  ).toISOString(),
};

describe('useOrders Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useOrdersStore as jest.Mock).mockReturnValue({
      orders: [mockOrder],
      activeOrder: null,
      loading: false,
      error: null,
      setOrders: jest.fn(),
      addOrder: jest.fn(),
      removeOrder: jest.fn(),
      setActiveOrder: jest.fn(),
      updateOrderStatus: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    });

    (useAuthStore as jest.Mock).mockReturnValue({
      shopId: 'shop-123',
      userId: 'user-123',
    });
  });

  describe('fetchOrders', () => {
    it('fetches orders successfully', async () => {
      mockService.getOrders.mockResolvedValueOnce({
        orders: [mockOrder],
        meta: { page: 1, total: 1, pages: 1 },
      });

      const { result } = renderHook(() => useOrders());

      await act(async () => {
        await result.current.fetchOrders();
      });

      expect(mockService.getOrders).toHaveBeenCalledWith(
        'shop-123',
        expect.objectContaining({
          status: 'pending',
          page: 1,
          limit: 20,
        })
      );
      expect(result.current.loading).toBe(false);
    });

    it('handles fetch error gracefully', async () => {
      mockService.getOrders.mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useOrders());

      await act(async () => {
        try {
          await result.current.fetchOrders();
        } catch {
          // Expected
        }
      });

      expect(result.current.loading).toBe(false);
    });

    it('supports pagination', async () => {
      mockService.getOrders.mockResolvedValueOnce({
        orders: [mockOrder],
        meta: { page: 2, total: 50, pages: 3 },
      });

      const { result } = renderHook(() => useOrders());

      await act(async () => {
        await result.current.fetchOrders({ page: 2 });
      });

      expect(mockService.getOrders).toHaveBeenCalledWith(
        'shop-123',
        expect.objectContaining({ page: 2 })
      );
    });

    it('supports status filtering', async () => {
      mockService.getOrders.mockResolvedValueOnce({
        orders: [{ ...mockOrder, status: 'accepted' }],
        meta: { page: 1, total: 1, pages: 1 },
      });

      const { result } = renderHook(() => useOrders());

      await act(async () => {
        await result.current.fetchOrders({ status: 'accepted' });
      });

      expect(mockService.getOrders).toHaveBeenCalledWith(
        'shop-123',
        expect.objectContaining({ status: 'accepted' })
      );
    });
  });

  describe('fetchOrderDetail', () => {
    it('fetches order detail successfully', async () => {
      mockService.getOrderDetail.mockResolvedValueOnce(mockOrder);

      const { result } = renderHook(() => useOrders());

      let order;
      await act(async () => {
        order = await result.current.fetchOrderDetail('order-123');
      });

      expect(mockService.getOrderDetail).toHaveBeenCalledWith('order-123');
      expect(order).toEqual(mockOrder);
    });

    it('handles order not found error', async () => {
      mockService.getOrderDetail.mockRejectedValueOnce(
        new Error('ORDER_NOT_FOUND')
      );

      const { result } = renderHook(() => useOrders());

      await expect(
        act(async () => {
          await result.current.fetchOrderDetail('nonexistent');
        })
      ).rejects.toThrow();
    });
  });

  describe('acceptCurrentOrder', () => {
    it('accepts order successfully', async () => {
      mockService.acceptOrder.mockResolvedValueOnce({
        ...mockOrder,
        status: 'accepted',
      });

      const { result } = renderHook(() => useOrders());

      await act(async () => {
        await result.current.acceptCurrentOrder('order-123');
      });

      expect(mockService.acceptOrder).toHaveBeenCalledWith('order-123');
    });

    it('handles acceptance error', async () => {
      mockService.acceptOrder.mockRejectedValueOnce(
        new Error('ORDER_ALREADY_ACCEPTED')
      );

      const { result } = renderHook(() => useOrders());

      await expect(
        act(async () => {
          await result.current.acceptCurrentOrder('order-123');
        })
      ).rejects.toThrow();
    });
  });

  describe('rejectCurrentOrder', () => {
    it('rejects order with reason successfully', async () => {
      mockService.rejectOrder.mockResolvedValueOnce({
        ...mockOrder,
        status: 'cancelled',
      });

      const { result } = renderHook(() => useOrders());

      await act(async () => {
        await result.current.rejectCurrentOrder('order-123', 'Out of stock');
      });

      expect(mockService.rejectOrder).toHaveBeenCalledWith(
        'order-123',
        'Out of stock'
      );
    });

    it('requires valid rejection reason', async () => {
      const { result } = renderHook(() => useOrders());

      await expect(
        act(async () => {
          await result.current.rejectCurrentOrder('order-123', '');
        })
      ).rejects.toThrow();
    });
  });

  describe('retry', () => {
    it('retries last failed operation', async () => {
      mockService.getOrders.mockRejectedValueOnce(new Error('Network error'));
      mockService.getOrders.mockResolvedValueOnce({
        orders: [mockOrder],
        meta: { page: 1, total: 1, pages: 1 },
      });

      const { result } = renderHook(() => useOrders());

      // First call fails
      await act(async () => {
        try {
          await result.current.fetchOrders();
        } catch {
          // Expected
        }
      });

      // Retry succeeds
      await act(async () => {
        await result.current.retry();
      });

      expect(mockService.getOrders).toHaveBeenCalledTimes(2);
    });
  });
});
