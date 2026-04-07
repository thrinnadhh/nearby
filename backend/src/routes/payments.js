import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { strictLimiter } from '../middleware/rateLimit.js';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  INVALID_WEBHOOK_SIGNATURE,
  PAYMENT_ALREADY_PROCESSED,
  INTERNAL_ERROR,
} from '../utils/errors.js';
import { supabase } from '../services/supabase.js';
import { redis } from '../services/redis.js';

const router = Router();
const CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET;

if (!CASHFREE_WEBHOOK_SECRET) {
  throw new Error('CASHFREE_WEBHOOK_SECRET is not configured');
}

/**
 * POST /api/v1/payments/webhook
 * Cashfree payment callback webhook.
 * Verifies HMAC-SHA256 signature before processing payment events.
 * Idempotent — checks Redis to prevent duplicate processing.
 *
 * Public endpoint (no auth required — Cashfree server initiates request).
 * Rate limiting applied to prevent abuse.
 *
 * @param {Object} req - Express request with body from Cashfree
 * @param {string} req.headers['x-webhook-signature'] - HMAC signature
 * @param {Object} req.body - Cashfree webhook payload
 * @param {string} req.body.event - Event type (e.g., PAYMENT_SUCCESS, PAYMENT_FAILED)
 * @param {Object} req.body.data - Event data including payment and order info
 */
router.post('/webhook', strictLimiter, async (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (!signature) {
    logger.warn('Cashfree webhook: missing signature header', { ip: req.ip });
    return res.status(400).json(
      errorResponse(
        INVALID_WEBHOOK_SIGNATURE,
        'Signature verification failed'
      )
    );
  }

  try {
    // Verify HMAC signature
    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', CASHFREE_WEBHOOK_SECRET)
      .update(body)
      .digest('base64');

    if (hash !== signature) {
      logger.warn('Cashfree webhook: signature mismatch', { ip: req.ip });
      return res.status(400).json(
        errorResponse(
          INVALID_WEBHOOK_SIGNATURE,
          'Signature verification failed'
        )
      );
    }

    const { event, data } = req.body;

    if (!event || !data) {
      logger.warn('Cashfree webhook: missing event or data', { ip: req.ip });
      return res.status(400).json(
        errorResponse(INTERNAL_ERROR, 'Invalid webhook payload')
      );
    }

    const paymentId = data.payment?.id;
    const orderId = data.order?.note;

    if (!paymentId || !orderId) {
      logger.warn('Cashfree webhook: missing payment or order ID', {
        ip: req.ip,
        event,
      });
      return res.status(400).json(
        errorResponse(INTERNAL_ERROR, 'Invalid webhook payload')
      );
    }

    // Check idempotency — has this payment been processed?
    const processed = await redis.get(`payment:${paymentId}:processed`);
    if (processed) {
      logger.info('Cashfree webhook: idempotent duplicate, skipping', {
        paymentId,
        orderId,
        event,
      });
      return res.status(200).json(
        successResponse({ status: 'already_processed' })
      );
    }

    // Mark as processing to prevent race conditions
    await redis.setex(`payment:${paymentId}:processing`, 30, '1');

    try {
      // Handle different events
      if (event === 'PAYMENT_SUCCESS') {
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'completed',
            payment_id: paymentId,
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
            errorResponse(
              INTERNAL_ERROR,
              'Payment recorded but order update failed'
            )
          );
        }

        // Mark as processed
        await redis.setex(`payment:${paymentId}:processed`, 86400, '1');
        logger.info('Cashfree webhook: payment success processed', {
          paymentId,
          orderId,
        });
      } else if (event === 'PAYMENT_FAILED') {
        // Revert stock, update order status
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'payment_failed',
            payment_status: 'failed',
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

        // Mark as processed
        await redis.setex(`payment:${paymentId}:processed`, 86400, '1');
        logger.info('Cashfree webhook: payment failed processed', {
          paymentId,
          orderId,
        });
      } else {
        // Unknown event type — log but mark as processed
        logger.warn('Cashfree webhook: unknown event type', {
          event,
          paymentId,
          orderId,
        });
        await redis.setex(`payment:${paymentId}:processed`, 86400, '1');
      }

      return res.status(200).json(successResponse({ status: 'processed' }));
    } catch (err) {
      logger.error('Cashfree webhook processing error', {
        paymentId,
        orderId,
        error: err.message,
        stack: err.stack,
      });
      await redis.del(`payment:${paymentId}:processing`);
      return res.status(500).json(
        errorResponse(INTERNAL_ERROR, 'Webhook processing failed')
      );
    }
  } catch (err) {
    logger.error('Cashfree webhook error', {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json(
      errorResponse(INTERNAL_ERROR, 'Webhook processing failed')
    );
  }
});

export default router;
