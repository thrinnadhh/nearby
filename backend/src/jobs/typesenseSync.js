import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger.js';
import { redis } from '../services/redis.js';
import { typesense } from '../services/typesense.js';

const TYPESENSE_SHOPS_INDEX = 'shops';
const TYPESENSE_SYNC_TIMEOUT = 15000; // 15 seconds

/**
 * BullMQ queue for async Typesense shop synchronization.
 * Used when: shop is_open toggled, shop trust_score updated, KYC approved.
 * Job data: { shopId: string, action: 'sync' | 'remove', shopData?: object }
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
 * Syncs shop documents or removes them from search index.
 */
const typesenseSyncWorker = new Worker(
  'typesense-sync',
  async (job) => {
    const { shopId, action, shopData } = job.data;

    logger.debug('Processing Typesense sync job', {
      jobId: job.id,
      shopId,
      action,
    });

    try {
      if (action === 'sync') {
        // Sync: upsert shop document to Typesense
        if (!shopData) {
          logger.warn('Typesense sync job missing shopData', { shopId, jobId: job.id });
          return;
        }

        // Construct Typesense shop document (must match schema)
        const typesenseDoc = {
          id: shopData.id,
          owner_id: shopData.owner_id,
          name: shopData.name,
          category: shopData.category,
          description: shopData.description || '',
          latitude: shopData.latitude || 0,
          longitude: shopData.longitude || 0,
          is_open: shopData.is_open,
          is_verified: shopData.is_verified,
          trust_score: shopData.trust_score || 50.0,
          created_at: Math.floor(new Date(shopData.created_at).getTime() / 1000),
          updated_at: Math.floor(new Date(shopData.updated_at).getTime() / 1000),
        };

        // Upsert document in Typesense
        await typesense
          .collections(TYPESENSE_SHOPS_INDEX)
          .documents()
          .upsert(typesenseDoc);

        logger.info('Typesense sync completed: upsert', {
          shopId,
          jobId: job.id,
        });
      } else if (action === 'remove') {
        // Remove: delete shop document from Typesense
        try {
          await typesense
            .collections(TYPESENSE_SHOPS_INDEX)
            .documents(shopId)
            .delete();

          logger.info('Typesense sync completed: remove', {
            shopId,
            jobId: job.id,
          });
        } catch (err) {
          // If document doesn't exist in Typesense, ignore the error
          if (err.statusCode === 404 || err.message?.includes('Not found')) {
            logger.debug('Typesense document already removed or never indexed', {
              shopId,
              jobId: job.id,
            });
            return;
          }
          throw err;
        }
      } else {
        logger.warn('Unknown Typesense sync action', {
          shopId,
          action,
          jobId: job.id,
        });
      }
    } catch (err) {
      logger.error('Typesense sync job failed', {
        jobId: job.id,
        shopId,
        action,
        error: err.message,
        stack: err.stack,
      });
      throw err; // Re-throw to trigger BullMQ retry logic
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
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
    shopId: job?.data?.shopId,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});

/**
 * Listen for job errors (transient errors during processing).
 */
typesenseSyncWorker.on('error', (err) => {
  logger.error('Typesense sync worker error', {
    error: err.message,
    stack: err.stack,
  });
});

export { typesenseSyncWorker };
