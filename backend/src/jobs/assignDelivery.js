import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'assign-delivery-test-job' }),
});

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
      async (job) => {
        logger.info('Assign-delivery job queued for later processing', {
          orderId: job.data.orderId,
          shopId: job.data.shopId,
          jobId: job.id,
        });
      },
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
}
