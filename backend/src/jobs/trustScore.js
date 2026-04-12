import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { typesenseSync } from '../jobs/typesenseSync.js';
import {
  calculateTrustScore,
  getTrustBadge,
  shouldAlertAdmin,
} from '../utils/trustScoreFormula.js';
import { emitToRoom } from '../socket/ioRegistry.js';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

const createTestStubQueue = () => ({
  add: async () => ({ id: 'trust-score-test-job' }),
});

export const trustScoreQueue = process.env.NODE_ENV === 'test'
  ? createTestStubQueue()
  : new Queue('trust-score', { connection });

export const processTrustScoreJob = async (job) => {
  logger.info('Starting nightly trust score recomputation');

  // 1. Fetch all verified shops
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, name, owner_id, kyc_verified_at')
    .eq('is_suspended', false);

  if (shopsError || !shops || shops.length === 0) {
    throw new Error(`Failed to fetch shops: ${shopsError?.message || 'no shops'}`);
  }

  let updatedCount = 0;
  let alertCount = 0;

  // 2. Recompute trust score for each shop
  for (const shop of shops) {
    try {
      // Get review stats
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('shop_id', shop.id)
        .eq('is_visible', true);

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Get completion rate from yesterday's analytics
      // (analytics-aggregate job runs at 3 AM; trust score at 2 AM reads the previous day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: latestAnalytics } = await supabase
        .from('shop_analytics')
        .select('completion_rate')
        .eq('shop_id', shop.id)
        .eq('date', yesterdayStr)
        .single();

      const completionRate = latestAnalytics?.completion_rate || 0;

      // Response score: inverse of avg acceptance time (100 = instant, 0 = very slow)
      const { data: latestOrder } = await supabase
        .from('orders')
        .select('accepted_at, created_at')
        .eq('shop_id', shop.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let responseScore = 50; // Default middle score
      if (latestOrder && latestOrder.accepted_at && latestOrder.created_at) {
        const acceptanceMs
          = new Date(latestOrder.accepted_at) - new Date(latestOrder.created_at);
        const acceptanceSeconds = acceptanceMs / 1000;
        // Score inversely: 0s = 100, 180s = 50, 600s+ = 0
        responseScore = Math.max(0, 100 - (acceptanceSeconds / 6));
      }

      // KYC bonus
      const kycVerified = !!shop.kyc_verified_at;

      // Calculate trust score
      const trustScore = calculateTrustScore(
        avgRating,
        completionRate,
        responseScore,
        kycVerified
      );
      const badge = getTrustBadge(trustScore);

      // 3. Update shop with new trust score
      const { error: updateError } = await supabase
        .from('shops')
        .update({
          trust_score: trustScore,
          trust_badge: badge,
          completion_rate: completionRate,
          response_score: responseScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id);

      if (updateError) {
        logger.warn('Failed to update trust score for shop', {
          shopId: shop.id,
          error: updateError.message,
        });
        continue;
      }

      // 4. Sync to Typesense
      try {
        await typesenseSync.add('sync', {
          type: 'shop',
          shopId: shop.id,
        });
      } catch (syncErr) {
        logger.warn('Failed to queue Typesense sync for shop', {
          shopId: shop.id,
          error: syncErr.message,
        });
      }

      // 5. Check if alert needed
      if (shouldAlertAdmin(trustScore)) {
        alertCount += 1;
        logger.warn('Trust score below threshold', {
          shopId: shop.id,
          shopName: shop.name,
          trustScore,
          badge,
        });

        // Emit alert to admin room
        emitToRoom('admin', 'trust-score-alert', {
          shopId: shop.id,
          shopName: shop.name,
          trustScore,
          badge,
          avgRating,
          completionRate,
          timestamp: new Date().toISOString(),
        });
      }

      updatedCount += 1;
    } catch (err) {
      logger.error('Error processing shop in trust score job', {
        shopId: shop.id,
        error: err.message,
      });
    }
  }

  logger.info('Trust score job completed', {
    totalShops: shops.length,
    updatedCount,
    alertCount,
    jobId: job.id,
  });

  return { updatedCount, alertCount };
};

const trustScoreWorker = process.env.NODE_ENV === 'test'
  ? null
  : new Worker('trust-score', processTrustScoreJob, { connection });

if (trustScoreWorker) {
  trustScoreWorker.on('completed', (job, result) => {
    logger.info('Trust score job completed', {
      jobId: job.id,
      result,
    });
  });

  trustScoreWorker.on('failed', (job, err) => {
    logger.error('Trust score job failed', {
      jobId: job?.id,
      error: err.message,
    });
  });
}

export default trustScoreQueue;
