import rateLimitLib from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../services/redis.js';
import { errorResponse } from '../utils/response.js';
import { RATE_LIMITED } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Mask phone number for logging (show only last 4 digits).
 * @private
 * @param {string} phone - Phone number
 * @returns {string} Masked phone number
 */
function maskPhone(phone) {
  if (!phone) return 'unknown';
  const digits = phone.replace(/\D/g, '');
  return `+91****${digits.slice(-4)}`;
}

/**
 * Create a store based on environment.
 * In production, use Redis. In test, use memory.
 */
const createStore = (prefix) => {
  // In test environment, use default memory store
  if (process.env.NODE_ENV === 'test') {
    return undefined; // express-rate-limit uses memory store by default
  }

  // In production/development, use Redis
  return new RedisStore({
    sendCommand: async (...args) => {
      // redis.call() expects command as first arg, then rest are parameters
      return redis.call(args[0], ...args.slice(1));
    },
    prefix,
  });
};

/**
 * Create a custom rate limiter with configurable window and max requests.
 * @param {string} name - Limiter name (for logging and Redis key prefix)
 * @param {number} max - Maximum requests per window
 * @param {number} windowSeconds - Time window in seconds (will be converted to milliseconds)
 * @param {Function} keyGenerator - Optional function to generate rate limit key (defaults to userId or IP)
 * @returns {Function} Express rate limit middleware
 */
export const rateLimit = (name, max, windowSeconds) => {
  return rateLimitLib({
    store: createStore(`rl:${name}:`),
    windowMs: windowSeconds * 1000, // Convert seconds to milliseconds
    max,
    keyGenerator: (req) => {
      return req.user?.userId || req.ip;
    },
    standardHeaders: false,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`${name} rate limit exceeded`, {
        userId: req.user?.userId || 'anonymous',
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json(
        errorResponse(RATE_LIMITED, `Too many ${name} requests. Please try again later.`)
      );
    },
  });
};

/**
 * Global rate limiter: 100 requests per 15 minutes per IP.
 * Uses Redis-backed store for distributed deployments.
 */
export const globalLimiter = rateLimitLib({
  store: createStore('rl:global:'),
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: false,
  skip: (req) => {
    return req.path === '/health' || req.path === '/readiness';
  },
  handler: (req, res) => {
    logger.warn('Global rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json(
      errorResponse(RATE_LIMITED, 'Too many requests. Please try again later.')
    );
  },
});

/**
 * OTP rate limiter: 5 OTP requests per hour per phone number.
 * Keyed by phone number to prevent brute force attacks on specific targets.
 * Phone numbers are masked in logs to protect PII.
 */
export const otpLimiter = rateLimitLib({
  store: createStore('rl:otp:'),
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    return req.body?.phone || req.ip;
  },
  handler: (req, res) => {
    logger.warn('OTP rate limit exceeded', {
      phone: maskPhone(req.body?.phone),
      ip: req.ip,
    });
    res.status(429).json(
      errorResponse(RATE_LIMITED, 'Too many OTP requests. Please try again after 1 hour.')
    );
  },
});

/**
 * Strict rate limiter: 10 requests per minute for sensitive endpoints.
 * Used for login, payment, order creation.
 */
export const strictLimiter = rateLimitLib({
  store: createStore('rl:strict:'),
  windowMs: 60 * 1000,
  max: 10,
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      path: req.path,
      ip: req.ip,
    });
    res.status(429).json(
      errorResponse(RATE_LIMITED, 'Too many requests. Please try again in a moment.')
    );
  },
});

/**
 * Search rate limiter: 30 requests per minute per user/IP.
 */
export const searchLimiter = rateLimitLib({
  store: createStore('rl:search:'),
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Search rate limit exceeded', {
      userId: req.user?.userId || 'anonymous',
      ip: req.ip,
    });
    res.status(429).json(
      errorResponse(RATE_LIMITED, 'Search rate limit exceeded. Please try again in a moment.')
    );
  },
});

/**
 * Slow rate limiter: 5 requests per minute per user for content creation (reviews, messages).
 * Prevents review spam and malicious content creation.
 */
export const slowLimiter = rateLimitLib({
  store: createStore('rl:slow:'),
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Slow rate limit exceeded', {
      userId: req.user?.userId || 'anonymous',
      ip: req.ip,
    });
    res.status(429).json(
      errorResponse(RATE_LIMITED, 'Too many requests. Please try again in a moment.')
    );
  },
});

/**
 * SMS broadcast rate limiter per phone number
 * Prevents spamming the same user with multiple SMS notifications
 * 
 * Limits:
 * - 5 SMS per user per hour (shared across all admin actions)
 * - 1 SMS per action type per user per hour (no duplicate notifications)
 */
export const createSmsBroadcastLimiter = () => {
  return async (req, phone, actionType = 'general') => {
    if (!phone || !redis) return true; // Allow if no phone or Redis unavailable
    
    // Key format: sms:broadcast:{phone}:{actionType}
    const smsLimitKey = `sms:broadcast:${phone}:${actionType}`;
    
    // Check if we've already sent this type of SMS in the last hour
    const lastSentTime = await redis.get(smsLimitKey);
    
    if (lastSentTime) {
      // SMS was already sent to this user for this action type
      logger.warn('SMS rate limit exceeded (duplicate action)', {
        phone: maskPhone(phone),
        actionType,
      });
      return false; // Don't send duplicate
    }
    
    // Check total SMS count for this user (all action types)
    const totalSmsKey = `sms:broadcast:${phone}:total`;
    const smsCount = await redis.incr(totalSmsKey);
    
    // Set TTL if this is first SMS in this hour
    if (smsCount === 1) {
      await redis.expire(totalSmsKey, 3600); // 1 hour
    }
    
    // Allow if under limit (5 SMS/hour)
    if (smsCount > 5) {
      logger.warn('SMS rate limit exceeded (hourly limit)', {
        phone: maskPhone(phone),
        smsCount,
        limit: 5,
      });
      return false; // Rate limit exceeded
    }
    
    // Mark this specific action as sent
    await redis.setex(smsLimitKey, 3600, Date.now()); // 1 hour TTL
    
    return true; // Allow SMS to be sent
  };
};

// Create singleton instance
export const checkSmsBroadcastLimit = createSmsBroadcastLimiter();

export default {
  rateLimit,
  globalLimiter,
  otpLimiter,
  strictLimiter,
  searchLimiter,
  slowLimiter,
  checkSmsBroadcastLimit,
  createSmsBroadcastLimiter,
};
