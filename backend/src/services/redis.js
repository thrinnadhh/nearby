import Redis from 'ioredis';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis;

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection failed, retrying in ${delay}ms`, { attempt: times });
      return delay;
    },
    enableReadyCheck: false,
    enableOfflineQueue: false,
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });
} catch (err) {
  logger.error('Failed to initialize Redis', { error: err.message });
  throw err;
}

export { redis };
