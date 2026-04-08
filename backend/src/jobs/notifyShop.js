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
      async (job) => {
        const { orderId, shopId } = job.data;

        const { data: shop, error } = await supabase
          .from('shops')
          .select('name, phone')
          .eq('id', shopId)
          .single();

        if (error || !shop) {
          throw new Error(`Shop not found for order ${orderId}`);
        }

        const { sendNotification } = await import('../services/msg91.js');
        await sendNotification(
          shop.phone,
          `New NearBy order received for ${shop.name}. Order ID: ${orderId}. Please accept within 3 minutes.`
        );

        logger.info('Notify-shop job completed', { orderId, shopId, jobId: job.id });
      },
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
