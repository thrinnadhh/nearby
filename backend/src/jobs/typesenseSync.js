import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { redis } from '../services/redis.js';
import { typesense } from '../services/typesense.js';

const TYPESENSE_SHOPS_INDEX = 'shops';
const TYPESENSE_PRODUCTS_INDEX = 'products';

/**
 * BullMQ queue for async Typesense synchronization.
 * Handles shop sync/remove and product sync/remove actions.
 *
 * Job data shapes:
 *   Shop sync:    { shopId, action: 'sync',           shopData?: object }
 *   Shop remove:  { shopId, action: 'remove' }
 *   Product sync: { productId, action: 'product_sync', productData: object }
 *   Product remove: { productId, action: 'product_remove' }
 */
export const typesenseSyncQueue = new Queue('typesense-sync', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Worker that processes Typesense sync jobs.
 * Syncs shop/product documents or removes them from the search index.
 */
const typesenseSyncWorker = new Worker(
  'typesense-sync',
  async (job) => {
    const { action } = job.data;

    logger.debug('Processing Typesense sync job', {
      jobId: job.id,
      action,
    });

    try {
      if (action === 'sync') {
        // ── Shop sync: upsert shop document ──────────────────────────────────
        const { shopId, shopData } = job.data;

        if (!shopData) {
          logger.warn('Typesense sync job missing shopData', { shopId, jobId: job.id });
          return;
        }

        const typesenseDoc = {
          id: shopData.id,
          owner_id: shopData.owner_id,
          name: shopData.name,
          category: shopData.category,
          description: shopData.description || '',
          latitude: shopData.latitude || 0,
          longitude: shopData.longitude || 0,
          geo_location: [
            Number(shopData.latitude || 0),
            Number(shopData.longitude || 0),
          ],
          is_open: shopData.is_open,
          is_verified: shopData.is_verified,
          trust_score: shopData.trust_score || 50.0,
          created_at: Math.floor(new Date(shopData.created_at).getTime() / 1000),
          updated_at: Math.floor(new Date(shopData.updated_at).getTime() / 1000),
        };

        await typesense
          .collections(TYPESENSE_SHOPS_INDEX)
          .documents()
          .upsert(typesenseDoc);

        logger.info('Typesense sync completed: shop upsert', { shopId, jobId: job.id });

      } else if (action === 'remove') {
        // ── Shop remove: delete shop document ────────────────────────────────
        const { shopId } = job.data;

        try {
          await typesense
            .collections(TYPESENSE_SHOPS_INDEX)
            .documents(shopId)
            .delete();

          logger.info('Typesense sync completed: shop remove', { shopId, jobId: job.id });
        } catch (err) {
          if (err.statusCode === 404 || err.message?.includes('Not found')) {
            logger.debug('Typesense shop document already removed or never indexed', {
              shopId,
              jobId: job.id,
            });
            return;
          }
          throw err;
        }

      } else if (action === 'product_sync') {
        // ── Product sync: upsert product document ────────────────────────────
        const { productId, productData } = job.data;

        if (!productData) {
          logger.warn('Typesense product_sync job missing productData', {
            productId,
            jobId: job.id,
          });
          return;
        }

        await typesense
          .collections(TYPESENSE_PRODUCTS_INDEX)
          .documents()
          .upsert({
            id: productId,
            ...productData,
          });

        logger.info('Typesense sync completed: product upsert', { productId, jobId: job.id });

      } else if (action === 'product_remove') {
        // ── Product remove: delete product document ───────────────────────────
        const { productId } = job.data;

        try {
          await typesense
            .collections(TYPESENSE_PRODUCTS_INDEX)
            .documents(productId)
            .delete();

          logger.info('Typesense sync completed: product remove', { productId, jobId: job.id });
        } catch (err) {
          if (err.message?.includes('Not Found') || err.statusCode === 404) {
            logger.debug('Typesense product document already removed or never indexed', {
              productId,
              jobId: job.id,
            });
            return;
          }
          throw err;
        }

      } else {
        logger.warn('Unknown Typesense sync action', {
          action,
          jobId: job.id,
          jobData: job.data,
        });
      }
    } catch (err) {
      logger.error('Typesense sync job failed', {
        jobId: job.id,
        action,
        error: err.message,
        stack: err.stack,
      });
      throw err; // Re-throw to trigger BullMQ retry logic
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

/**
 * Listen for job completion (for logging/monitoring).
 */
typesenseSyncWorker.on('completed', (job) => {
  logger.debug('Typesense sync job completed', {
    jobId: job.id,
    durationSeconds: (job.finishedOn - job.processedOn) / 1000,
  });
});

/**
 * Listen for job failures (after all retries exhausted).
 */
typesenseSyncWorker.on('failed', (job, err) => {
  logger.error('Typesense sync job failed permanently', {
    jobId: job?.id,
    action: job?.data?.action,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});

/**
 * Listen for worker errors (transient errors during processing).
 */
typesenseSyncWorker.on('error', (err) => {
  logger.error('Typesense sync worker error', {
    error: err.message,
    stack: err.stack,
  });
});

export { typesenseSyncWorker };
