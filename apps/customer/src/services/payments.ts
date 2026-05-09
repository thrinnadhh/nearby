import { client } from './api';
import logger from '@/utils/logger';

/**
 * Cashfree Payment Service
 * Handles payment session initialization and verification
 */

interface CashfreeConfig {
  appId: string;
  environment: 'PRODUCTION' | 'SANDBOX';
}

interface PaymentSession {
  payment_session_id: string;
  payment_link: string;
  order_id: string;
}

interface PaymentResult {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  orderId: string;
  transactionId?: string;
  errorMessage?: string;
}

/**
 * Initialize Cashfree SDK with app credentials
 * This should be called once during app initialization
 */
export function initializeCashfree(config: CashfreeConfig) {
  // In production, you would initialize the native Cashfree SDK here
  // import Cashfree from 'react-native-cashfree-pg';
  // Cashfree.initialize(config);

  logger.info(`[Cashfree] Initialized in ${config.environment} mode`);
}

/**
 * Verify payment after user completes Cashfree checkout
 * Backend confirms payment via Cashfree API
 */
export async function verifyPayment(orderId: string): Promise<PaymentResult> {
  try {
    const response = await client.get<{
      success: boolean;
      data?: {
        orderId: string;
        paymentStatus: 'completed' | 'pending' | 'failed' | 'refunded';
        paymentMethod: 'upi' | 'card' | 'cod';
        cashfreeOrderId?: string | null;
        paymentId?: string | null;
      };
      error?: {
        code: string;
        message: string;
      };
    }>(`/payments/${orderId}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to verify payment');
    }

    const orderData = response.data.data;

    if (orderData.paymentStatus === 'completed') {
      return {
        status: 'SUCCESS',
        orderId: orderData.orderId,
        transactionId: orderData.paymentId || undefined,
      };
    }

    if (orderData.paymentStatus === 'failed') {
      return {
        status: 'FAILED',
        orderId: orderData.orderId,
        errorMessage: 'Payment failed',
      };
    }

    return {
      status: 'PENDING',
      orderId: orderData.orderId,
    };
  } catch (error) {
    logger.error('[PaymentService] Verification error:', { error });
    throw error;
  }
}

/**
 * Poll payment status every N seconds until completion or timeout
 * Max polls: 40 (120 seconds total at 3-second intervals)
 */
export async function pollPaymentStatus(
  orderId: string,
  maxPolls = 40,
  intervalMs = 3000
): Promise<PaymentResult> {
  let pollCount = 0;

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await verifyPayment(orderId);

        if (result.status !== 'PENDING') {
          clearInterval(pollInterval);
          resolve(result);
          return;
        }

        pollCount++;

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          reject(new Error('Payment verification timeout'));
        }
      } catch (error) {
        logger.error('[PaymentService] Poll error:', { error });
        // Continue polling on error
      }
    }, intervalMs);
  });
}

/**
 * Handle Cashfree payment result from webhook or native SDK callback
 * In production, this would be called by native Cashfree callback handler
 */
export function handlePaymentResult(result: {
  orderId: string;
  transactionId?: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
}): PaymentResult {
  if (result.status === 'SUCCESS') {
    return {
      status: 'SUCCESS',
      orderId: result.orderId,
      transactionId: result.transactionId,
    };
  }

  return {
    status: 'FAILED',
    orderId: result.orderId,
    errorMessage:
      result.errorMessage ||
      (result.status === 'CANCELLED' ? 'Payment was cancelled' : 'Payment failed'),
  };
}

/**
 * Create payment session via backend
 * Returns session ID and payment link for user to complete payment
 */
export async function createPaymentSession(orderId: string): Promise<{
  sessionId: string;
  paymentLink: string;
}> {
  const response = await client.post<{
    success: boolean;
    data?: {
      paymentSessionId: string;
      paymentLink: string | null;
    };
    error?: {
      code: string;
      message: string;
    };
  }>('/payments/initiate', { order_id: orderId });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to create payment session');
  }

  return {
    sessionId: response.data.data.paymentSessionId,
    paymentLink: response.data.data.paymentLink || '',
  };
}

/**
 * Get refund status for a paid order
 */
export async function getRefundStatus(
  orderId: string
): Promise<{
  refundStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'none';
  refundAmount?: number;
  refundDate?: string;
}> {
  const response = await client.get<{
    success: boolean;
    data?: {
      paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
      updatedAt?: string;
    };
    error?: {
      code: string;
      message: string;
    };
  }>(`/payments/${orderId}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get refund status');
  }

  return {
    refundStatus:
      response.data.data.paymentStatus === 'refunded'
        ? 'completed'
        : 'none',
    refundDate: response.data.data.updatedAt,
  };
}

/**
 * Initiate refund for a paid order (e.g., if customer cancels)
 */
export async function initiateRefund(
  orderId: string,
  reason: string
): Promise<{
  refundId: string | null;
  amount: number;
  status: string;
}> {
  const response = await client.patch<{
    success: boolean;
    data?: {
      id: string;
      totalPaise: number;
      paymentStatus?: string;
    };
    error?: {
      code: string;
      message: string;
    };
  }>(`/orders/${orderId}/cancel`, { reason });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to initiate refund');
  }

  return {
    refundId: null,
    amount: response.data.data.totalPaise,
    status: response.data.data.paymentStatus || 'processing',
  };
}

/**
 * Validate payment callback from deep-link
 * Ensures orderId is valid UUID and status is known value
 * Prevents malformed or spoofed callbacks
 */
export function validateCallback(
  orderId: string,
  status: string
): { valid: boolean; error?: string } {
  // Validate orderId is UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!orderId || !uuidRegex.test(orderId)) {
    return { valid: false, error: 'Invalid order ID format' };
  }

  // Validate status is known value
  if (!['success', 'failed'].includes(status)) {
    return { valid: false, error: 'Invalid payment status' };
  }

  return { valid: true };
}

/**
 * Generate deep-link callback URL for Cashfree redirect
 * Format: nearby-customer://payment-callback?orderId=UUID&status=success|failed
 */
export function generateDeepLinkCallback(orderId: string): string {
  const baseUrl = 'nearby-customer://payment-callback';
  const params = new URLSearchParams({
    orderId,
    // Status will be appended by Cashfree or handled by payment processor
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Extract orderId from deep-link callback URL
 * Inverse of generateDeepLinkCallback()
 */
export function extractOrderIdFromCallback(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('orderId') || null;
  } catch {
    return null;
  }
}
