import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import AnalyticsService from '../services/analytics.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'analytics-aggregate-test-job' }),
});

export const analyticsAggregateQueue = process.env.NODE_ENV === 'test'
  ? createTestStubQueue()
  : new Queue('analytics-aggregate', { connection });

export const processAnalyticsAggregateJob = async (job) => {
  logger.info('Starting nightly analytics aggregation job');

  // 1. Fetch all verified shops
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, name')
    .eq('is_suspended', false);

  if (shopsError || !shops || shops.length === 0) {
    logger.warn('No shops found for analytics aggregation');
    return { processedCount: 0, errorCount: 0 };
  }

  let processedCount = 0;
  let errorCount = 0;

  // 2. Aggregate metrics for each shop for yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const shop of shops) {
    try {
      await AnalyticsService.aggregateDailyMetrics(shop.id, yesterday);
      processedCount += 1;
    } catch (err) {
      logger.error('Failed to aggregate analytics for shop', {
        shopId: shop.id,
        shopName: shop.name,
        error: err.message,
      });
      errorCount += 1;
    }
  }

  logger.info('Analytics aggregation job completed', {
    totalShops: shops.length,
    processedCount,
    errorCount,
    jobId: job.id,
  });

  return { processedCount, errorCount };
};

const analyticsWorker = process.env.NODE_ENV === 'test'
  ? null
  : new Worker('analytics-aggregate', processAnalyticsAggregateJob, {
    connection,
  });

if (analyticsWorker) {
  analyticsWorker.on('completed', (job, result) => {
    logger.info('Analytics job completed', {
      jobId: job.id,
      result,
    });
  });

  analyticsWorker.on('failed', (job, err) => {
    logger.error('Analytics job failed', {
      jobId: job?.id,
      error: err.message,
    });
  });

  analyticsWorker.on('error', (err) => {
    logger.error('Analytics worker error', { error: err.message });
  });
}

export default analyticsAggregateQueue;
