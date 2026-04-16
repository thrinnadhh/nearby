import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeCashfree,
  verifyPayment,
  pollPaymentStatus,
  handlePaymentResult,
  createPaymentSession,
  getRefundStatus,
  initiateRefund,
} from '@/services/payments';
import { api } from '@/services/api';

vi.mock('@/services/api');

describe('Payments Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeCashfree', () => {
    it('should initialize Cashfree SDK in SANDBOX mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      initializeCashfree({
        appId: 'test-app-id',
        environment: 'SANDBOX',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SANDBOX'));
      consoleSpy.mockRestore();
    });

    it('should initialize Cashfree SDK in PRODUCTION mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      initializeCashfree({
        appId: 'prod-app-id',
        environment: 'PRODUCTION',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PRODUCTION'));
      consoleSpy.mockRestore();
    });
  });

  describe('verifyPayment', () => {
    it('should verify successful payment', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            order_id: 'order-123',
            payment_status: 'completed',
            payment_method: 'upi',
            transaction_id: 'txn-456',
          },
        },
      } as any);

      const result = await verifyPayment('order-123');

      expect(result.status).toBe('SUCCESS');
      expect(result.orderId).toBe('order-123');
      expect(result.transactionId).toBe('txn-456');
    });

    it('should return PENDING if payment still processing', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            order_id: 'order-123',
            payment_status: 'pending',
            payment_method: 'card',
          },
        },
      } as any);

      const result = await verifyPayment('order-123');

      expect(result.status).toBe('PENDING');
      expect(result.orderId).toBe('order-123');
    });

    it('should return FAILED if payment declined', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            order_id: 'order-123',
            payment_status: 'failed',
            payment_method: 'card',
            error_message: 'Card declined by bank',
          },
        },
      } as any);

      const result = await verifyPayment('order-123');

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Card declined by bank');
    });

    it('should throw error if API fails', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        },
      } as any);

      await expect(verifyPayment('invalid-id')).rejects.toThrow('Order not found');
    });
  });

  describe('pollPaymentStatus', () => {
    it('should poll until payment completes', async () => {
      const mockResponses = [
        {
          data: {
            success: true,
            data: {
              order_id: 'order-123',
              payment_status: 'pending',
              payment_method: 'upi',
            },
          },
        },
        {
          data: {
            success: true,
            data: {
              order_id: 'order-123',
              payment_status: 'completed',
              payment_method: 'upi',
              transaction_id: 'txn-789',
            },
          },
        },
      ];

      vi.mocked(api.get)
        .mockResolvedValueOnce(mockResponses[0] as any)
        .mockResolvedValueOnce(mockResponses[1] as any);

      const result = await pollPaymentStatus('order-123', 10, 100);

      expect(result.status).toBe('SUCCESS');
      expect(result.transactionId).toBe('txn-789');
    });

    it('should timeout if payment takes too long', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: {
            order_id: 'order-123',
            payment_status: 'pending',
            payment_method: 'upi',
          },
        },
      } as any);

      await expect(
        pollPaymentStatus('order-123', 2, 50) // Only 2 polls, 50ms interval
      ).rejects.toThrow('Payment verification timeout');
    });
  });

  describe('handlePaymentResult', () => {
    it('should handle successful payment result', () => {
      const result = handlePaymentResult({
        orderId: 'order-123',
        transactionId: 'txn-456',
        status: 'SUCCESS',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.orderId).toBe('order-123');
      expect(result.transactionId).toBe('txn-456');
    });

    it('should handle cancelled payment', () => {
      const result = handlePaymentResult({
        orderId: 'order-123',
        status: 'CANCELLED',
      });

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toContain('cancelled');
    });

    it('should handle payment with error message', () => {
      const result = handlePaymentResult({
        orderId: 'order-123',
        status: 'FAILED',
        errorMessage: 'Insufficient funds',
      });

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Insufficient funds');
    });
  });

  describe('createPaymentSession', () => {
    it('should create payment session', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            paymentSessionId: 'session-123',
            paymentLink: 'https://checkout.cashfree.com/session-123',
          },
        },
      } as any);

      const result = await createPaymentSession('order-456');

      expect(api.post).toHaveBeenCalledWith('/api/v1/payments/initiate', {
        order_id: 'order-456',
      });
      expect(result.sessionId).toBe('session-123');
      expect(result.paymentLink).toContain('cashfree');
    });

    it('should throw error if session creation fails', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'INVALID_ORDER', message: 'Order not found' },
        },
      } as any);

      await expect(createPaymentSession('invalid-id')).rejects.toThrow('Order not found');
    });
  });

  describe('getRefundStatus', () => {
    it('should fetch refund status', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            refund_status: 'completed',
            refund_amount: 5000,
            refund_date: '2026-04-16T10:00:00Z',
          },
        },
      } as any);

      const result = await getRefundStatus('order-123');

      expect(result.refundStatus).toBe('completed');
      expect(result.refundAmount).toBe(5000);
      expect(result.refundDate).toBe('2026-04-16T10:00:00Z');
    });

    it('should return none if no refund initiated', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            refund_status: 'none',
          },
        },
      } as any);

      const result = await getRefundStatus('order-123');

      expect(result.refundStatus).toBe('none');
      expect(result.refundAmount).toBeUndefined();
    });
  });

  describe('initiateRefund', () => {
    it('should initiate refund with reason', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            refund_id: 'refund-789',
            amount: 5000,
            status: 'processing',
          },
        },
      } as any);

      const result = await initiateRefund('order-123', 'User cancelled order');

      expect(api.post).toHaveBeenCalledWith('/api/v1/payments/order-123/refund', {
        reason: 'User cancelled order',
      });
      expect(result.refund_id).toBe('refund-789');
      expect(result.status).toBe('processing');
    });

    it('should throw error if refund fails', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'REFUND_ERROR', message: 'Refund not allowed' },
        },
      } as any);

      await expect(
        initiateRefund('order-123', 'User request')
      ).rejects.toThrow('Refund not allowed');
    });
  });
});
