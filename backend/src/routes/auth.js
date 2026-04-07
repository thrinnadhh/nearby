import { Router } from 'express';
import { otpLimiter } from '../middleware/rateLimit.js';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { redis } from '../services/redis.js';

const router = Router();

const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCKOUT_DURATION = 600; // 10 minutes in seconds
const OTP_VALIDITY_DURATION = 300; // 5 minutes in seconds

/**
 * POST /api/v1/auth/send-otp
 * Send OTP to phone number for authentication.
 * Rate limited to 5 requests per hour per phone number.
 */
router.post('/send-otp', otpLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Invalid phone number format (10 digits required)')
      );
    }

    logger.info('OTP requested', { phone });

    // TODO: Generate OTP, store in Redis, send via MSG91
    // When implementing: MANDATORY OTP lockout logic below
    // 1. Check OTP_LOCKED key in Redis
    // 2. Increment OTP_ATTEMPTS counter
    // 3. After 3 failed attempts, set OTP_LOCKED flag with 10-minute TTL
    // 4. Lock logic example:
    //    const attemptKey = `otp:attempts:${phone}`;
    //    const attempts = await redis.incr(attemptKey);
    //    if (attempts === 1) {
    //      await redis.expire(attemptKey, 3600); // 1 hour window
    //    }
    //    if (attempts > OTP_MAX_ATTEMPTS) {
    //      await redis.setex(`${attemptKey}:locked`, OTP_LOCKOUT_DURATION, '1');
    //      return res.status(429).json(
    //        errorResponse('OTP_LOCKED', `Too many attempts. Try again in 10 minutes`)
    //      );
    //    }

    res.json(successResponse({ status: 'otp_sent' }));
  } catch (err) {
    logger.error('Send OTP error', { error: err.message });
    next(err);
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and return JWT token for authenticated session.
 * Implements OTP lockout: 3 failed attempts lock for 10 minutes.
 */
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', 'Phone and OTP are required')
      );
    }

    // TODO: Implement OTP lockout logic
    // const attemptKey = `otp:attempts:${phone}`;
    // const lockoutKey = `${attemptKey}:locked`;
    //
    // // Check if locked out
    // const lockoutTime = await redis.ttl(lockoutKey);
    // if (lockoutTime > 0) {
    //   logger.warn('OTP verification: account locked', { phone, remainingSeconds: lockoutTime });
    //   return res.status(429).json(
    //     errorResponse('OTP_LOCKED', `Too many attempts. Try again in ${lockoutTime} seconds`)
    //   );
    // }
    //
    // // Verify OTP against Redis
    // const storedOtp = await redis.get(`otp:${phone}`);
    // if (storedOtp !== otp) {
    //   const attempts = await redis.incr(attemptKey);
    //   if (attempts === 1) {
    //     await redis.expire(attemptKey, 3600); // 1 hour window
    //   }
    //
    //   if (attempts > OTP_MAX_ATTEMPTS) {
    //     await redis.setex(lockoutKey, OTP_LOCKOUT_DURATION, '1');
    //     return res.status(429).json(
    //       errorResponse('OTP_LOCKED', `Too many attempts. Try again in 10 minutes`)
    //     );
    //   }
    //
    //   return res.status(400).json(
    //     errorResponse('INVALID_OTP', `Invalid OTP. ${OTP_MAX_ATTEMPTS - attempts} attempts remaining`)
    //   );
    // }
    //
    // // Clear attempts on success
    // await redis.del(attemptKey);

    logger.info('OTP verified', { phone });

    // TODO: Create or update user profile, generate JWT token
    // const token = generateToken({ userId, phone, role });

    res.json(successResponse({
      status: 'verified',
      // token,
    }));
  } catch (err) {
    logger.error('Verify OTP error', { error: err.message });
    next(err);
  }
});

export default router;
