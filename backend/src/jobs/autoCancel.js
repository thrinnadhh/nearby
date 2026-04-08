import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'auto-cancel-test-job' }),
});

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
      async (job) => {
        const { orderId } = job.data;

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, status')
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
          return;
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

        await supabase
          .from('orders')
          .update({
            status: 'auto_cancelled',
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        logger.info('Auto-cancel job completed', { orderId, jobId: job.id });
      },
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
