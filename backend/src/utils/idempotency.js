import { getRedis } from '../services/redis.js';

const TTL_SECONDS = 86400; // 24 hours

export const checkIdempotency = async (key) => {
  const redis = getRedis();
  const existing = await redis.get(`idempotency:${key}`);
  return existing ? JSON.parse(existing) : null;
};

export const saveIdempotency = async (key, result) => {
  const redis = getRedis();
  await redis.setex(`idempotency:${key}`, TTL_SECONDS, JSON.stringify(result));
};
