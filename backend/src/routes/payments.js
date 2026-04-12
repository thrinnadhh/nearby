import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import { strictLimiter } from '../middleware/rateLimit.js';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  FORBIDDEN,
  INTERNAL_ERROR,
  INVALID_WEBHOOK_SIGNATURE,
  PAYMENT_NOT_FOUND,
} from '../utils/errors.js';
import { supabase } from '../services/supabase.js';
import { redis } from '../services/redis.js';
import { createPaymentSession, getPaymentStatus } from '../services/cashfree.js';
import { initiatePaymentSchema } from '../utils/validators.js';

const router = Router();
const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET;
const PAYMENT_PROCESSED_TTL_SECONDS = 86400;

if (!CASHFREE_WEBHOOK_SECRET) {
  throw new Error('CASHFREE_WEBHOOK_SECRET is not configured');
}

const fetchOrderForPayment = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_id, shop_id, status, total_paise, payment_method, payment_status, payment_id, cashfree_order_id, created_at, updated_at')
    .eq('id', orderId);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
};

const assertOrderAccess = (user, order) => {
  if (user.role === 'customer' && order.customer_id !== user.userId) {
    const error = new Error('Forbidden');
    error.code = FORBIDDEN;
    throw error;
  }

  if (user.role === 'shop_owner' && order.shop_id !== user.shopId) {
    const error = new Error('Forbidden');
    error.code = FORBIDDEN;
    throw error;
  }
};

const restoreOrderStock = async (orderId) => {
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity, cancelled_quantity')
    .eq('order_id', orderId);

  if (itemsError) {
    throw new Error(`Failed to load order items for payment rollback: ${itemsError.message}`);
  }

  const productIds = (items || []).map((item) => item.product_id);
  if (productIds.length === 0) {
    return;
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, stock_quantity')
    .in('id', productIds);

  if (productsError) {
    throw new Error(`Failed to load products for payment rollback: ${productsError.message}`);
  }

  const stockMap = new Map((products || []).map((product) => [product.id, product.stock_quantity]));

  for (const item of items) {
    const activeQuantity = Math.max(item.quantity - (item.cancelled_quantity || 0), 0);
    if (activeQuantity <= 0) {
      continue;
    }

    const nextStock = (stockMap.get(item.product_id) || 0) + activeQuantity;
    await supabase
      .from('products')
      .update({
        stock_quantity: nextStock,
        is_available: nextStock > 0,
      })
      .eq('id', item.product_id);
  }
};

router.post(
  '/initiate',
  authenticate,
  roleGuard(['customer']),
  validate(initiatePaymentSchema),
  async (req, res, next) => {
    try {
      const { order_id: orderId } = req.body;
      const order = await fetchOrderForPayment(orderId);

      if (!order) {
        return res.status(404).json(errorResponse(PAYMENT_NOT_FOUND, 'Order not found for payment.'));
      }

      assertOrderAccess(req.user, order);

      if (order.payment_status === 'completed') {
        return res.status(200).json(successResponse({
          orderId: order.id,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          cashfreeOrderId: order.cashfree_order_id || null,
          paymentSessionId: null,
          paymentLink: null,
          alreadyPaid: true,
        }));
      }

      if (order.payment_method === 'cod') {
        await supabase
          .from('orders')
          .update({
            payment_status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        return res.status(200).json(successResponse({
          orderId: order.id,
          paymentStatus: 'completed',
          paymentMethod: 'cod',
          cashfreeOrderId: null,
          paymentSessionId: null,
          paymentLink: null,
          mode: 'cod',
        }));
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, phone')
        .eq('id', req.user.userId);

      if (profileError || !profiles || profiles.length === 0) {
        return res.status(500).json(errorResponse(INTERNAL_ERROR, 'Customer profile not found.'));
      }

      const profile = profiles[0];

      const cashfreeOrderId = order.cashfree_order_id || `nearby-${order.id}`;
      const session = await createPaymentSession({
        order_id: cashfreeOrderId,
        order_amount: order.total_paise / 100,
        order_currency: 'INR',
        customer_details: {
          customer_id: profile.id,
          customer_phone: profile.phone,
          customer_email: `${profile.id}@nearby.local`,
        },
        order_note: order.id,
      });

      await supabase
        .from('orders')
        .update({
          cashfree_order_id: cashfreeOrderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      return res.status(200).json(successResponse({
        orderId: order.id,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        cashfreeOrderId,
        paymentSessionId: session.payment_session_id || null,
        paymentLink: session.payment_link || null,
      }));
    } catch (error) {
      if (error.code === FORBIDDEN) {
        return res.status(403).json(
          errorResponse(FORBIDDEN, 'You can only initiate payments for your own orders.')
        );
      }

      logger.error('Payment initiation failed', {
        userId: req.user?.userId,
        orderId: req.body?.order_id,
        error: error.message,
      });
      return next(error);
    }
  }
);

router.get('/:id', authenticate, roleGuard(['customer', 'shop_owner']), async (req, res, next) => {
  try {
    const order = await fetchOrderForPayment(req.params.id);

    if (!order) {
      return res.status(404).json(errorResponse(PAYMENT_NOT_FOUND, 'Order not found for payment.'));
    }

    assertOrderAccess(req.user, order);

    let gatewayStatus = null;
    if (order.cashfree_order_id && order.payment_method !== 'cod') {
      try {
        gatewayStatus = await getPaymentStatus(order.cashfree_order_id);
      } catch (error) {
        logger.warn('Failed to fetch gateway payment status', {
          orderId: order.id,
          cashfreeOrderId: order.cashfree_order_id,
          error: error.message,
        });
      }
    }

    return res.status(200).json(successResponse({
      orderId: order.id,
      orderStatus: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentId: order.payment_id || null,
      cashfreeOrderId: order.cashfree_order_id || null,
      gatewayStatus,
      updatedAt: order.updated_at,
    }));
  } catch (error) {
    if (error.code === FORBIDDEN) {
      return res.status(403).json(
        errorResponse(FORBIDDEN, 'You can only view payments for accessible orders.')
      );
    }

    return next(error);
  }
});

router.post('/webhook', strictLimiter, async (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (!signature) {
    logger.warn('Cashfree webhook: missing signature header', { ip: req.ip });
    return res.status(400).json(
      errorResponse(INVALID_WEBHOOK_SIGNATURE, 'Signature verification failed')
    );
  }

  try {
    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', CASHFREE_WEBHOOK_SECRET)
      .update(body)
      .digest('base64');

    try {
      const hashBuffer = Buffer.from(hash, 'base64');
      const signatureBuffer = Buffer.from(signature, 'base64');

      // Check buffer lengths before comparison to avoid timingSafeEqual error
      if (hashBuffer.length !== signatureBuffer.length) {
        logger.warn('Cashfree webhook: signature length mismatch', { ip: req.ip });
        return res.status(400).json(
          errorResponse(INVALID_WEBHOOK_SIGNATURE, 'Signature verification failed')
        );
      }

      if (!crypto.timingSafeEqual(hashBuffer, signatureBuffer)) {
        logger.warn('Cashfree webhook: signature mismatch', { ip: req.ip });
        return res.status(400).json(
          errorResponse(INVALID_WEBHOOK_SIGNATURE, 'Signature verification failed')
        );
      }
    } catch (bufferError) {
      logger.warn('Cashfree webhook: invalid signature format', { ip: req.ip, error: bufferError.message });
      return res.status(400).json(
        errorResponse(INVALID_WEBHOOK_SIGNATURE, 'Signature verification failed')
      );
    }

    const { event, data } = req.body;

    if (!event || !data) {
      logger.warn('Cashfree webhook: missing event or data', { ip: req.ip });
      return res.status(400).json(errorResponse(INTERNAL_ERROR, 'Invalid webhook payload'));
    }

    const paymentId = data.payment?.id;
    const cashfreeOrderId = data.order?.order_id;
    const orderId = data.order?.note;

    if (!paymentId || !orderId) {
      logger.warn('Cashfree webhook: missing payment or order ID', { ip: req.ip, event });
      return res.status(400).json(errorResponse(INTERNAL_ERROR, 'Invalid webhook payload'));
    }

    const processed = await redis.get(`payment:${paymentId}:processed`);
    if (processed) {
      logger.info('Cashfree webhook: idempotent duplicate, skipping', {
        paymentId,
        orderId,
        event,
      });
      return res.status(200).json(successResponse({ status: 'already_processed' }));
    }

    await redis.setex(`payment:${paymentId}:processing`, 30, '1');

    try {
      if (event === 'PAYMENT_SUCCESS') {
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'completed',
            payment_id: paymentId,
            cashfree_order_id: cashfreeOrderId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) {
          logger.error('Failed to update order on payment success', {
            orderId,
            paymentId,
            error: error.message,
          });
          await redis.del(`payment:${paymentId}:processing`);
          return res.status(500).json(
            errorResponse(INTERNAL_ERROR, 'Payment recorded but order update failed')
          );
        }

        await redis.setex(`payment:${paymentId}:processed`, PAYMENT_PROCESSED_TTL_SECONDS, '1');
        logger.info('Cashfree webhook: payment success processed', { paymentId, orderId });
      } else if (event === 'PAYMENT_FAILED') {
        await restoreOrderStock(orderId);

        const { error } = await supabase
          .from('orders')
          .update({
            status: 'payment_failed',
            payment_status: 'failed',
            payment_id: paymentId,
            cashfree_order_id: cashfreeOrderId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (error) {
          logger.error('Failed to update order on payment failure', {
            orderId,
            paymentId,
            error: error.message,
          });
        }

        await redis.setex(`payment:${paymentId}:processed`, PAYMENT_PROCESSED_TTL_SECONDS, '1');
        logger.info('Cashfree webhook: payment failed processed', { paymentId, orderId });
      } else {
        logger.warn('Cashfree webhook: unknown event type', { event, paymentId, orderId });
        await redis.setex(`payment:${paymentId}:processed`, PAYMENT_PROCESSED_TTL_SECONDS, '1');
      }

      await redis.del(`payment:${paymentId}:processing`);
      return res.status(200).json(successResponse({ status: 'processed' }));
    } catch (err) {
      logger.error('Cashfree webhook processing error', {
        paymentId,
        orderId,
        error: err.message,
        stack: err.stack,
      });
      await redis.del(`payment:${paymentId}:processing`);
      return res.status(500).json(errorResponse(INTERNAL_ERROR, 'Webhook processing failed'));
    }
  } catch (err) {
    logger.error('Cashfree webhook error', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json(errorResponse(INTERNAL_ERROR, 'Webhook processing failed'));
  }
});

export default router;
