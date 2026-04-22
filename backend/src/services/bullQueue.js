import { Queue } from 'bullmq';
import { redis } from './redis.js';
import logger from '../utils/logger.js';

/**
 * BullMQ Queue instances for async job processing
 * Uses Redis as backend for job storage and processing
 */

// Main queue for various job types
const queue = new Queue('nearbyJobs', {
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

// Named queues for specific job types
const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

const broadcastQueue = new Queue('broadcasts', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

const analyticsQueue = new Queue('analytics', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

// Event listeners for all queues
[queue, notificationQueue, broadcastQueue, analyticsQueue].forEach(q => {
  q.on('error', (error) => {
    logger.error(`Queue ${q.name} error`, { error: error.message });
  });

  q.on('drained', () => {
    logger.debug(`Queue ${q.name} drained — all jobs processed`);
  });
});

export { queue, notificationQueue, broadcastQueue, analyticsQueue };
export default queue;
