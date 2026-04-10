import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'notify-shop-test-job' }),
});

const buildFallbackMessage = (shopName, orderId, itemCount, total) => {
  const orderSummary = itemCount ? `${itemCount} item(s)` : 'a new order';
  const totalSummary = Number.isFinite(total) ? ` worth Rs ${(total / 100).toFixed(2)}` : '';
  return `New NearBy order received for ${shopName}: ${orderSummary}${totalSummary}. Order ID: ${orderId}. Please accept within 3 minutes.`;
};

export const processNotifyShopJob = async (job) => {
  const { orderId, shopId, itemCount = null, total = null } = job.data;

  const { data: shop, error } = await supabase
    .from('shops')
    .select('name, phone, owner_id')
    .eq('id', shopId)
    .single();

  if (error || !shop) {
    throw new Error(`Shop not found for order ${orderId}`);
  }

  const message = buildFallbackMessage(shop.name, orderId, itemCount, total);
  let pushDelivered = false;

  if (shop.owner_id) {
    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', shop.owner_id)
        .single();

      const candidateToken = ownerProfile?.fcm_token || ownerProfile?.device_token || ownerProfile?.push_token;
      if (candidateToken) {
        const { sendHighPriorityNotification } = await import('../services/fcm.js');
        await sendHighPriorityNotification(
          candidateToken,
          {
            title: 'New NearBy order',
            body: `Order ${orderId} needs acceptance within 3 minutes.`,
          },
          {
            orderId,
            shopId,
            type: 'order_created',
          }
        );
        pushDelivered = true;
      }
    } catch (pushError) {
      logger.warn('Notify-shop push notification failed; using SMS fallback', {
        orderId,
        shopId,
        error: pushError.message,
      });
    }
  }

  if (!pushDelivered) {
    const { sendNotification } = await import('../services/msg91.js');
    await sendNotification(shop.phone, message);
  }

  logger.info('Notify-shop job completed', { orderId, shopId, jobId: job.id, pushDelivered });
};

export const notifyShopQueue = process.env.NODE_ENV === 'test'
  ? createTestStubQueue()
  : new Queue('notify-shop', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

export const notifyShopWorker = process.env.NODE_ENV === 'test'
  ? {}
  : new Worker(
      'notify-shop',
      processNotifyShopJob,
      { connection, concurrency: 5 }
    );

if (notifyShopWorker.on) {
  notifyShopWorker.on('failed', (job, error) => {
    logger.error('Notify-shop job failed', {
      jobId: job?.id,
      orderId: job?.data?.orderId,
      error: error.message,
    });
  });
}
