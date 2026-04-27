import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { redis } from '../services/redis.js';
import { emitToRoom } from '../socket/ioRegistry.js';

// Sanitize DB row before emitting over Socket.IO — strip internal payment fields
function toSafeOrderPayload(order) {
  return {
    id: order.id,
    customerId: order.customer_id,
    shopId: order.shop_id,
    deliveryPartnerId: order.delivery_partner_id,
    status: order.status,
    totalPaise: order.total_paise,
    paymentMethod: order.payment_method,
    acceptedAt: order.accepted_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'assign-delivery-test-job' }),
});

/**
 * Core processor extracted for unit testability.
 * Finds the nearest available delivery partner and assigns them to the order.
 */
export const processAssignDeliveryJob = async (job) => {
  const { orderId, shopId, customerId } = job.data;

  // 1. Fetch order — guard against moved-on orders
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, status, delivery_partner_id, shop_id, customer_id')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    logger.warn('assignDelivery: order not found', { orderId });
    return;
  }

  if (order.status !== 'ready') {
    logger.info('assignDelivery: order no longer ready, skipping', {
      orderId,
      status: order.status,
    });
    return;
  }

  if (order.delivery_partner_id) {
    logger.info('assignDelivery: already assigned, skipping', { orderId });
    return;
  }

  // 2. Fetch shop location
  const { data: shop, error: shopErr } = await supabase
    .from('shops')
    .select('id, latitude, longitude')
    .eq('id', shopId)
    .single();

  if (shopErr || !shop) {
    throw new Error(`Cannot fetch shop location for shopId=${shopId}`);
  }

  // 3. Redis GEOSEARCH for nearest available delivery partners within 5km
  // GEOSEARCH key FROMLONLAT lng lat BYRADIUS radius unit ASC COUNT count
  const partners = await redis.call(
    'GEOSEARCH',
    'delivery:available',
    'FROMLONLAT', String(shop.longitude), String(shop.latitude),
    'BYRADIUS', '5', 'km',
    'ASC',
    'COUNT', '10'
  );

  if (!partners || partners.length === 0) {
    const maxAttempts = job.opts?.attempts ?? 3;
    const isLastAttempt = job.attemptsMade >= maxAttempts - 1;
    if (isLastAttempt) {
      logger.error('assignDelivery: no partner available after all retries', {
        orderId,
        shopId,
      });
      emitToRoom('admin', 'admin:alert', {
        type: 'NO_PARTNER_AVAILABLE',
        orderId,
        shopId,
      });
    }
    throw new Error('NO_PARTNER_AVAILABLE');
  }

  const partnerId = partners[0];

  // 4. Update order — optimistic lock on status = 'ready'
  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabase
    .from('orders')
    .update({
      delivery_partner_id: partnerId,
      status: 'assigned',
      updated_at: now,
    })
    .eq('id', orderId)
    .eq('status', 'ready')
    .select()
    .single();

  if (updateErr || !updated) {
    logger.info('assignDelivery: order already assigned by another instance', { orderId });
    return;
  }

  // 5. Notify delivery partner via Socket.IO — sanitized payload only
  emitToRoom(`delivery:${partnerId}`, 'delivery:assigned', {
    orderId,
    shopId,
    customerId,
    order: toSafeOrderPayload(updated),
  });

  // 6. Notify customer (enqueue, never inline)
  const { notifyCustomerQueue } = await import('./notifyCustomer.js');
  await notifyCustomerQueue.add('notify-customer', {
    orderId,
    customerId: order.customer_id,
    status: 'assigned',
  });

  logger.info('assignDelivery: partner assigned', { orderId, partnerId });
};

export const assignDeliveryQueue = process.env.NODE_ENV === 'test'
  ? createTestStubQueue()
  : new Queue('assign-delivery', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

export const assignDeliveryWorker = process.env.NODE_ENV === 'test'
  ? {}
  : new Worker(
      'assign-delivery',
      processAssignDeliveryJob,
      { connection, concurrency: 5 }
    );

if (assignDeliveryWorker.on) {
  assignDeliveryWorker.on('failed', (job, error) => {
    logger.error('Assign-delivery job failed', {
      jobId: job?.id,
      orderId: job?.data?.orderId,
      error: error.message,
    });
  });

  assignDeliveryWorker.on('error', (err) => {
    logger.error('Assign-delivery worker error', { error: err.message });
  });
}
