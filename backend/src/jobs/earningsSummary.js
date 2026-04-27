import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { sendNotification } from '../services/msg91.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'earnings-summary-test-job' }),
});

export const earningsSummaryQueue = process.env.NODE_ENV === 'test'
  ? createTestStubQueue()
  : new Queue('earnings-summary', { connection });

export const processEarningsSummaryJob = async (job) => {
  logger.info('Starting weekly earnings summary job');

  // 1. Calculate earnings for the past 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // 2. Fetch all shops
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, name, owner_id, phone')
    .eq('is_suspended', false);

  if (shopsError || !shops || shops.length === 0) {
    logger.warn('No shops found for earnings summary');
    return { sentCount: 0, errorCount: 0 };
  }

  let sentCount = 0;
  let errorCount = 0;

  // 3. Generate and send summary for each shop
  for (const shop of shops) {
    try {
      // Get analytics for the week
      const { data: analytics } = await supabase
        .from('shop_analytics')
        .select('*')
        .eq('shop_id', shop.id)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (!analytics || analytics.length === 0) {
        logger.info('No analytics data for shop', { shopId: shop.id });
        continue;
      }

      // Aggregate weekly metrics
      const totalOrders = analytics.reduce((sum, a) => sum + a.total_orders, 0);
      const completedOrders = analytics.reduce(
        (sum, a) => sum + a.completed_orders,
        0
      );
      const grossRevenue = analytics.reduce(
        (sum, a) => sum + a.gross_revenue_paise,
        0
      );
      const netRevenue = analytics.reduce((sum, a) => sum + a.net_revenue_paise, 0);
      const avgCompletion
        = analytics.length > 0
          ? (analytics.reduce((sum, a) => sum + a.completion_rate, 0)
            / analytics.length).toFixed(2)
          : 0;

      // Format message
      const message = `NearBy Weekly Summary: ${totalOrders} orders, `
        + `${completedOrders} completed, `
        + `Rs ${(netRevenue / 100).toFixed(2)} net earnings. `
        + `Completion rate: ${avgCompletion}%. Period: ${startDateStr} to ${endDateStr}`;

      // Send SMS
      if (shop.phone) {
        try {
          await sendNotification(shop.phone, message);
          sentCount += 1;
        } catch (smsErr) {
          logger.warn('Failed to send earnings SMS', {
            shopId: shop.id,
            error: smsErr.message,
          });
          errorCount += 1;
        }
      } else {
        logger.warn('Shop has no phone number', { shopId: shop.id });
      }
    } catch (err) {
      logger.error('Error generating earnings summary for shop', {
        shopId: shop.id,
        error: err.message,
      });
      errorCount += 1;
    }
  }

  logger.info('Earnings summary job completed', {
    totalShops: shops.length,
    sentCount,
    errorCount,
    jobId: job.id,
  });

  return { sentCount, errorCount };
};

const earningsWorker = process.env.NODE_ENV === 'test'
  ? null
  : new Worker('earnings-summary', processEarningsSummaryJob, {
    connection,
  });

if (earningsWorker) {
  earningsWorker.on('completed', (job, result) => {
    logger.info('Earnings summary job completed', {
      jobId: job.id,
      result,
    });
  });

  earningsWorker.on('failed', (job, err) => {
    logger.error('Earnings summary job failed', {
      jobId: job?.id,
      error: err.message,
    });
  });

  earningsWorker.on('error', (err) => {
    logger.error('Earnings summary worker error', { error: err.message });
  });
}

export default earningsSummaryQueue;
