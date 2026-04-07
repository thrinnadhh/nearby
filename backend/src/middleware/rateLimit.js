import rateLimit from 'express-rate-limit';
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
 * Global rate limiter: 100 requests per 15 minutes per IP.
 * Uses Redis-backed store for distributed deployments.
 */
export const globalLimiter = rateLimit({
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
export const otpLimiter = rateLimit({
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
export const strictLimiter = rateLimit({
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
export const searchLimiter = rateLimit({
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

export default {
  globalLimiter,
  otpLimiter,
  strictLimiter,
  searchLimiter,
};
