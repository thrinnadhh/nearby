import { api } from './api';

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

  console.log(`[Cashfree] Initialized in ${config.environment} mode`);
}

/**
 * Verify payment after user completes Cashfree checkout
 * Backend confirms payment via Cashfree API
 */
export async function verifyPayment(orderId: string): Promise<PaymentResult> {
  try {
    const response = await api.get<{
      success: boolean;
      data?: {
        order_id: string;
        payment_status: 'completed' | 'pending' | 'failed';
        payment_method: 'upi' | 'card' | 'cod';
        cashfree_order_id?: string;
        transaction_id?: string;
        error_message?: string;
      };
      error?: {
        code: string;
        message: string;
      };
    }>(`/api/v1/orders/${orderId}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to verify payment');
    }

    const orderData = response.data.data;

    if (orderData.payment_status === 'completed') {
      return {
        status: 'SUCCESS',
        orderId: orderData.order_id,
        transactionId: orderData.transaction_id,
      };
    }

    if (orderData.payment_status === 'failed') {
      return {
        status: 'FAILED',
        orderId: orderData.order_id,
        errorMessage: orderData.error_message || 'Payment failed',
      };
    }

    return {
      status: 'PENDING',
      orderId: orderData.order_id,
    };
  } catch (error) {
    console.error('[PaymentService] Verification error:', error);
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
        }

        pollCount++;

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          reject(new Error('Payment verification timeout'));
        }
      } catch (error) {
        console.error('[PaymentService] Poll error:', error);
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
  const response = await api.post<{
    success: boolean;
    data?: {
      paymentSessionId: string;
      paymentLink: string;
    };
    error?: {
      code: string;
      message: string;
    };
  }>('/api/v1/payments/initiate', { order_id: orderId });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to create payment session');
  }

  return {
    sessionId: response.data.data.paymentSessionId,
    paymentLink: response.data.data.paymentLink,
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
  const response = await api.get<{
    success: boolean;
    data?: {
      refund_status: 'pending' | 'processing' | 'completed' | 'failed' | 'none';
      refund_amount?: number;
      refund_date?: string;
    };
    error?: {
      code: string;
      message: string;
    };
  }>(`/api/v1/payments/${orderId}/refund`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get refund status');
  }

  return {
    refundStatus: response.data.data.refund_status,
    refundAmount: response.data.data.refund_amount,
    refundDate: response.data.data.refund_date,
  };
}

/**
 * Initiate refund for a paid order (e.g., if customer cancels)
 */
export async function initiateRefund(
  orderId: string,
  reason: string
): Promise<{
  refundId: string;
  amount: number;
  status: string;
}> {
  const response = await api.post<{
    success: boolean;
    data?: {
      refund_id: string;
      amount: number;
      status: string;
    };
    error?: {
      code: string;
      message: string;
    };
  }>(`/api/v1/payments/${orderId}/refund`, { reason });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to initiate refund');
  }

  return response.data.data;
}
