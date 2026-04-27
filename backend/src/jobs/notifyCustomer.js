import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'notify-customer-test-job' }),
});

export const notifyCustomerQueue = process.env.NODE_ENV === 'test'
  ? createTestStubQueue()
  : new Queue('notify-customer', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

export const notifyCustomerWorker = process.env.NODE_ENV === 'test'
  ? {}
  : new Worker(
      'notify-customer',
      async (job) => {
        const { orderId, customerId, status } = job.data;

        const { data: customer, error } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', customerId)
          .single();

        if (error || !customer) {
          throw new Error(`Customer not found for order ${orderId}`);
        }

        const { sendNotification } = await import('../services/msg91.js');
        await sendNotification(
          customer.phone,
          `Your NearBy order ${orderId} is now ${status.replace(/_/g, ' ')}.`
        );

        logger.info('Notify-customer job completed', { orderId, customerId, status, jobId: job.id });
      },
      { connection, concurrency: 5 }
    );

if (notifyCustomerWorker.on) {
  notifyCustomerWorker.on('failed', (job, error) => {
    logger.error('Notify-customer job failed', {
      jobId: job?.id,
      orderId: job?.data?.orderId,
      error: error.message,
    });
  });

  notifyCustomerWorker.on('error', (err) => {
    logger.error('Notify-customer worker error', { error: err.message });
  });
}
