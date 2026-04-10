import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'auto-cancel-test-job' }),
  remove: async () => 1,
});

const AUTO_CANCEL_TRUST_SCORE_PENALTY = 1;

export const processAutoCancelJob = async (job) => {
  const { orderId } = job.data;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, customer_id, shop_id, payment_method, payment_id, total_paise')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found for auto-cancel: ${orderId}`);
  }

  if (order.status !== 'pending') {
    logger.info('Auto-cancel skipped for non-pending order', {
      orderId,
      status: order.status,
    });
    return { skipped: true };
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity, cancelled_quantity')
    .eq('order_id', orderId);

  if (itemsError) {
    throw new Error(`Failed to load order items for auto-cancel: ${itemsError.message}`);
  }

  const productIds = (orderItems || []).map((item) => item.product_id);
  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .in('id', productIds);

    if (productsError) {
      throw new Error(`Failed to load products for auto-cancel: ${productsError.message}`);
    }

    const stockMap = new Map((products || []).map((product) => [product.id, product.stock_quantity]));

    for (const item of orderItems) {
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
  }

  if (order.payment_method !== 'cod' && order.payment_id && order.total_paise > 0) {
    try {
      const { refundPayment } = await import('../services/cashfree.js');
      await refundPayment(order.payment_id, order.total_paise, 'auto_cancelled');
    } catch (error) {
      logger.error('Auto-cancel refund failed', {
        orderId,
        paymentId: order.payment_id,
        error: error.message,
      });
    }
  }

  await supabase
    .from('orders')
    .update({
      status: 'auto_cancelled',
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  try {
    const { data: shop } = await supabase
      .from('shops')
      .select('id, trust_score')
      .eq('id', order.shop_id)
      .single();

    if (shop) {
      await supabase
        .from('shops')
        .update({
          trust_score: Math.max(Number(shop.trust_score || 0) - AUTO_CANCEL_TRUST_SCORE_PENALTY, 0),
        })
        .eq('id', shop.id);
    }
  } catch (error) {
    logger.warn('Auto-cancel trust score update skipped', {
      orderId,
      shopId: order.shop_id,
      error: error.message,
    });
  }

  try {
    const { notifyCustomerQueue } = await import('./notifyCustomer.js');
    await notifyCustomerQueue.add('notify-customer', {
      orderId,
      customerId: order.customer_id,
      status: 'auto_cancelled',
    });
  } catch (error) {
    logger.warn('Auto-cancel customer notification enqueue failed', {
      orderId,
      error: error.message,
    });
  }

  logger.info('Auto-cancel job completed', { orderId, jobId: job.id });
  return { skipped: false };
};

export const autoCancelQueue = process.env.NODE_ENV === 'test'
  ? createTestStubQueue()
  : new Queue('auto-cancel', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

export const autoCancelWorker = process.env.NODE_ENV === 'test'
  ? {}
  : new Worker(
      'auto-cancel',
      processAutoCancelJob,
      { connection, concurrency: 5 }
    );

if (autoCancelWorker.on) {
  autoCancelWorker.on('failed', (job, error) => {
    logger.error('Auto-cancel job failed', {
      jobId: job?.id,
      orderId: job?.data?.orderId,
      error: error.message,
    });
  });
}
