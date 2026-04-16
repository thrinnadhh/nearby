import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOrder,
  getOrder,
  getOrders,
  initiatePayment,
  getPaymentStatus,
  generateIdempotencyKey,
} from '@/services/orders';
import { api } from '@/services/api';

// Mock the api module
vi.mock('@/services/api');

describe('Orders Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateIdempotencyKey', () => {
    it('should generate a valid UUID v4', () => {
      const key = generateIdempotencyKey();
      // UUID v4 regex pattern
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(key).toMatch(uuidPattern);
    });

    it('should generate different keys on each call', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        shop_id: 'shop-1',
        shop_name: 'Test Shop',
        status: 'pending' as const,
        total_paise: 5000,
        items: [],
        payment_method: 'upi' as const,
        created_at: '2026-04-16T10:00:00Z',
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: { id: 'order-123', status: 'pending' },
        },
      } as any);

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, data: mockOrder },
      } as any);

      const payload = {
        shop_id: 'shop-1',
        items: [],
        delivery_address: '123 Main St',
        delivery_coords: { lat: 12.9, lng: 77.6 },
        payment_method: 'upi' as const,
        total_paise: 5000,
        idempotency_key: 'key-123',
      };

      const result = await createOrder(payload);

      expect(api.post).toHaveBeenCalledWith('/api/v1/orders', payload);
      expect(api.get).toHaveBeenCalledWith('/api/v1/orders/order-123');
      expect(result.id).toBe('order-123');
    });

    it('should throw error if API fails', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'INVALID_ORDER', message: 'Order validation failed' },
        },
      } as any);

      const payload = {
        shop_id: 'shop-1',
        items: [],
        delivery_address: '123 Main St',
        delivery_coords: { lat: 12.9, lng: 77.6 },
        payment_method: 'upi' as const,
        total_paise: 5000,
        idempotency_key: 'key-123',
      };

      await expect(createOrder(payload)).rejects.toThrow(
        'Order validation failed'
      );
    });

    it('should throw error if response has no data', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: false,
          error: { message: 'Server error' },
        },
      } as any);

      const payload = {
        shop_id: 'shop-1',
        items: [],
        delivery_address: '123 Main St',
        delivery_coords: { lat: 12.9, lng: 77.6 },
        payment_method: 'upi' as const,
        total_paise: 5000,
        idempotency_key: 'key-123',
      };

      await expect(createOrder(payload)).rejects.toThrow('Server error');
    });
  });

  describe('getOrder', () => {
    it('should fetch a single order', async () => {
      const mockOrder = {
        id: 'order-123',
        shop_id: 'shop-1',
        shop_name: 'Test Shop',
        status: 'pending' as const,
        total_paise: 5000,
        items: [],
        payment_method: 'upi' as const,
        created_at: '2026-04-16T10:00:00Z',
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, data: mockOrder },
      } as any);

      const result = await getOrder('order-123');

      expect(api.get).toHaveBeenCalledWith('/api/v1/orders/order-123');
      expect(result.id).toBe('order-123');
    });

    it('should throw error if order not found', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        },
      } as any);

      await expect(getOrder('invalid-id')).rejects.toThrow('Order not found');
    });
  });

  describe('getOrders', () => {
    it('should fetch all orders for user', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          shop_id: 'shop-1',
          shop_name: 'Shop 1',
          status: 'delivered' as const,
          total_paise: 5000,
          items: [],
          payment_method: 'upi' as const,
          created_at: '2026-04-16T10:00:00Z',
        },
        {
          id: 'order-2',
          shop_id: 'shop-2',
          shop_name: 'Shop 2',
          status: 'pending' as const,
          total_paise: 3000,
          items: [],
          payment_method: 'cod' as const,
          created_at: '2026-04-16T11:00:00Z',
        },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, data: mockOrders },
      } as any);

      const result = await getOrders();

      expect(api.get).toHaveBeenCalledWith('/api/v1/orders');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
    });

    it('should return empty array if no orders', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, data: [] },
      } as any);

      const result = await getOrders();

      expect(result).toEqual([]);
    });
  });

  describe('initiatePayment', () => {
    it('should initiate payment session', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            session_url: 'https://checkout.cashfree.com/session-123',
            order_id: 'order-456',
          },
        },
      } as any);

      const result = await initiatePayment('order-456');

      expect(api.post).toHaveBeenCalledWith('/api/v1/payments/initiate', {
        order_id: 'order-456',
      });
      expect(result.session_url).toBe('https://checkout.cashfree.com/session-123');
      expect(result.order_id).toBe('order-456');
    });

    it('should throw error if payment init fails', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'PAYMENT_ERROR', message: 'Payment gateway error' },
        },
      } as any);

      await expect(initiatePayment('order-456')).rejects.toThrow(
        'Payment gateway error'
      );
    });
  });

  describe('getPaymentStatus', () => {
    it('should fetch payment status', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: { status: 'SUCCESS', paid: true },
        },
      } as any);

      const result = await getPaymentStatus('order-789');

      expect(api.get).toHaveBeenCalledWith('/api/v1/payments/order-789');
      expect(result.paid).toBe(true);
      expect(result.status).toBe('SUCCESS');
    });

    it('should include error in response if payment failed', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: 'FAILED',
            paid: false,
            error: 'Declined by bank',
          },
        },
      } as any);

      const result = await getPaymentStatus('order-789');

      expect(result.paid).toBe(false);
      expect(result.error).toBe('Declined by bank');
    });
  });
});
