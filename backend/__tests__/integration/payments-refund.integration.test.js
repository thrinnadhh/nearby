import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import RefundService from '../../src/services/refund.js';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase service
jest.mock('../../src/services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock Cashfree service
jest.mock('../../src/services/cashfree.js', () => ({
  createRefund: jest.fn().mockResolvedValue({
    cf_refund_id: 'refund-123',
    order_id: 'order-123',
    refund_amount: 500.00,
    refund_status: 'success',
  }),
  getRefundStatus: jest.fn().mockResolvedValue({
    refund_status: 'success',
    refund_amount: 500.00,
  }),
}));

// Mock Redis service
jest.mock('../../src/services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
  },
}));

describe('Refund Service', () => {
  let orderId;
  let shopId;
  let customerId;
  let mockSupabase;

  beforeAll(async () => {
    orderId = uuidv4();
    shopId = uuidv4();
    customerId = uuidv4();

    const { supabase } = await import('../../src/services/supabase.js');
    mockSupabase = supabase;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refundPayment', () => {
    it('should skip refund for COD orders', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                customer_id: customerId,
                shop_id: shopId,
                status: 'pending',
                total_paise: 50000,
                payment_method: 'cod',
                payment_status: 'completed',
                cashfree_order_id: null,
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await RefundService.refundPayment(orderId, 50000, 'test');
      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('cod_no_refund');
    });

    it('should throw error if order not found', async () => {
      const fakeId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Order not found' },
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(RefundService.refundPayment(fakeId, 50000)).rejects.toThrow();
    });
  });

  describe('reconcileRefund', () => {
    it('should update order payment status to refunded', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                customer_id: customerId,
                shop_id: shopId,
                status: 'pending',
                total_paise: 50000,
                payment_method: 'card',
                payment_status: 'refunded',
                cashfree_order_id: 'order-123',
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await RefundService.reconcileRefund(orderId, 'refund-123', 50000);
      expect(result.status).toBe('reconciled');
      expect(result.orderId).toBe(orderId);
    });
  });
});
