import logger from '../utils/logger.js';
import { supabase } from './supabase.js';
import { initiateRefund } from './cashfree.js';
import {
  AppError,
  ORDER_NOT_FOUND,
  INTERNAL_ERROR,
  PAYMENT_FAILED,
} from '../utils/errors.js';

/**
 * Refund Service
 * Handles payment refunds and reconciliation via Cashfree
 * Called when: order cancelled, payment failed, partial item cancellation
 */

class RefundService {
  static async _fetchOrder(orderId) {
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'id, customer_id, shop_id, status, total_paise, '
        + 'payment_method, payment_status, payment_id, cashfree_order_id'
      )
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new AppError(ORDER_NOT_FOUND, 'Order not found.', 404);
    }

    return order;
  }

  /**
   * Create a refund for non-COD orders via Cashfree
   * COD orders have no payment to refund
   * @param {string} orderId - Order ID
   * @param {number} amountPaise - Amount to refund in paise
   * @param {string} reason - Refund reason (cancelled, failed_payment, etc.)
   * @returns {Object} Refund details { refundId, status, amountPaise }
   */
  static async refundPayment(orderId, amountPaise, reason = 'order_cancelled') {
    // 1. Fetch order
    const order = await this._fetchOrder(orderId);

    // 2. No refund needed for COD orders
    if (order.payment_method === 'cod') {
      logger.info('Skipping refund for COD order', { orderId });
      return {
        refundId: null,
        status: 'skipped',
        amountPaise,
        reason: 'cod_no_refund',
      };
    }

    // 3. No refund if payment not completed
    if (order.payment_status !== 'completed') {
      logger.info('Skipping refund: payment not completed', {
        orderId,
        paymentStatus: order.payment_status,
      });
      return {
        refundId: null,
        status: 'skipped',
        amountPaise,
        reason: 'payment_not_completed',
      };
    }

    // 4. No cashfree_order_id means refund cannot proceed
    if (!order.cashfree_order_id) {
      logger.warn('Cannot refund: missing cashfree_order_id', { orderId });
      throw new AppError(
        PAYMENT_FAILED,
        'Refund cannot be processed (missing payment ID).',
        500
      );
    }

    // 5. Call Cashfree API to initiate refund
    let refundResult;
    try {
      refundResult = await initiateRefund(
        order.cashfree_order_id,
        amountPaise,
        reason
      );
    } catch (err) {
      logger.error('Cashfree refund API failed', {
        orderId,
        error: err.message,
      });
      throw new AppError(
        PAYMENT_FAILED,
        'Refund processing failed. Please contact support.',
        500
      );
    }

    logger.info('Refund initiated via Cashfree', {
      orderId,
      refundId: refundResult.refund_id,
      amountPaise,
      status: refundResult.refund_status,
    });

    return {
      refundId: refundResult.refund_id,
      status: refundResult.refund_status,
      amountPaise,
      reason,
    };
  }

  /**
   * Reconcile a payment refund: update order status and analytics
   * Called after Cashfree webhook confirms refund success
   * @param {string} orderId - Order ID
   * @param {string} refundId - Cashfree refund ID
   * @param {number} refundedPaise - Amount refunded in paise
   */
  static async reconcileRefund(orderId, refundId, refundedPaise) {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_status, total_paise, shop_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      throw new AppError(ORDER_NOT_FOUND, 'Order not found.', 404);
    }

    // Update order payment status to reflect refund
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      logger.error('Failed to update order refund status', {
        orderId,
        refundId,
        error: updateError.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Refund reconciliation failed.', 500);
    }

    logger.info('Refund reconciled', {
      orderId,
      refundId,
      refundedPaise,
      previousStatus: order.payment_status,
    });

    return {
      orderId,
      refundId,
      refundedPaise,
      status: 'reconciled',
    };
  }
}

export default RefundService;
