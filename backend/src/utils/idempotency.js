import { redis } from '../services/redis.js';

const TTL_SECONDS = 600; // 10 minutes

export const checkIdempotencyKey = async (key) => {
  const existing = await redis.get(key);
  return existing ? JSON.parse(existing) : null;
};

export const setIdempotencyKey = async (key, result, ttlSeconds = TTL_SECONDS) => {
  await redis.setex(key, ttlSeconds, JSON.stringify(result));
};

export { TTL_SECONDS as IDEMPOTENCY_TTL_SECONDS };
