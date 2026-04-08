import { Router } from 'express';
import { randomInt } from 'crypto';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AppError, INVALID_OTP, OTP_EXPIRED, OTP_LOCKED, INVALID_PHONE } from '../utils/errors.js';
import { redis } from '../services/redis.js';
import { supabase } from '../services/supabase.js';
import { phoneSchema, verifyOtpSchema } from '../utils/validators.js';
import { generateToken } from '../middleware/auth.js';
import { otpLimiter } from '../middleware/rateLimit.js';
import { sendOtp } from '../services/msg91.js';

const router = Router();

// Constants for OTP flow
const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCKOUT_DURATION = 600; // 10 minutes in seconds
const OTP_VALIDITY_DURATION = 300; // 5 minutes in seconds

/**
 * Normalizes phone number to +91{10-digits} format.
 * @private
 * @param {string} phone - 10-digit phone number
 * @returns {string} Normalized phone with +91 prefix
 */
function normalizePhone(phone) {
  return `+91${phone}`;
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 * In dev mode, returns 123456. In prod, random 6-digit number.
 * @private
 * @returns {string} 6-digit OTP
 */
function generateOtp() {
  // Dev mode: always return 123456 (MSG91 not called)
  if (process.env.NODE_ENV === 'development') {
    return '123456';
  }
  // Prod: cryptographically secure random 6-digit OTP
  const otp = randomInt(100000, 1000000).toString();
  return otp;
}

/**
 * POST /api/v1/auth/send-otp
 * Send OTP to phone number for authentication.
 * Rate limited to 5 requests per hour per phone number.
 *
 * Request body:
 *   { phone: "9876543210" }
 *
 * Response:
 *   { success: true, data: { status: "otp_sent" } }
 */
router.post('/send-otp', otpLimiter, async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = phoneSchema.validate(req.body);
    if (error) {
      logger.warn('Send OTP validation failed', { error: error.message });
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', error.details[0].message)
      );
    }

    const { phone } = value;
    const normalizedPhone = normalizePhone(phone);

    logger.info('Send OTP requested', { phone: phone.slice(-4) });

    // Check if user is currently locked out (3 failed attempts in past 10 min)
    const lockoutKey = `otp:lockout:${phone}`;
    const isLocked = await redis.exists(lockoutKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey);
      logger.warn('Send OTP blocked: user locked out', {
        phone: phone.slice(-4),
        ttlSeconds: ttl,
      });
      return res.status(429).json(
        errorResponse(OTP_LOCKED, `Too many failed attempts. Try again in ${ttl} seconds`)
      );
    }

    // Generate and store OTP in Redis with 5-minute TTL
    const otp = generateOtp();
    const otpKey = `otp:code:${phone}`;
    await redis.setex(otpKey, OTP_VALIDITY_DURATION, otp);

    // Clear any previous attempt counter on successful OTP generation
    const attemptsKey = `otp:attempts:${phone}`;
    await redis.del(attemptsKey);

    // Send OTP via MSG91 (only if not in dev mode)
    if (process.env.NODE_ENV !== 'development') {
      try {
        await sendOtp(normalizedPhone, otp);
      } catch (smsErr) {
        // Log SMS failure but don't fail the endpoint
        // User can still verify with the OTP they received
        logger.error('Failed to send SMS via MSG91', {
          phone: phone.slice(-4),
          error: smsErr.message,
        });
        // In production, you might want to queue a retry job here
        // For now, we proceed - the OTP is in Redis and user can verify
      }
    }

    logger.info('OTP generated and stored', {
      phone: phone.slice(-4),
      devMode: process.env.NODE_ENV === 'development',
    });

    res.json(successResponse({
      status: 'otp_sent',
      expiresIn: OTP_VALIDITY_DURATION,
    }));
  } catch (err) {
    logger.error('Send OTP error', { error: err.message });
    next(err);
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and create/authenticate user, return JWT token.
 * Implements OTP lockout: 3 failed attempts lock for 10 minutes.
 *
 * Request body:
 *   { phone: "9876543210", otp: "123456" }
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       userId: "uuid",
 *       phone: "+919876543210",
 *       role: "customer",
 *       token: "jwt_token"
 *     }
 *   }
 */
router.post('/verify-otp', async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = verifyOtpSchema.validate(req.body);
    if (error) {
      logger.warn('Verify OTP validation failed', { error: error.message });
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', error.details[0].message)
      );
    }

    const { phone, otp } = value;
    const normalizedPhone = normalizePhone(phone);

    // Check if user is locked out from too many failed attempts
    const lockoutKey = `otp:lockout:${phone}`;
    const isLocked = await redis.exists(lockoutKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey);
      logger.warn('Verify OTP blocked: user locked out', {
        phone: phone.slice(-4),
        ttlSeconds: ttl,
      });
      return res.status(429).json(
        errorResponse(OTP_LOCKED, `Too many failed attempts. Try again in ${ttl} seconds`)
      );
    }

    // Retrieve OTP from Redis
    const otpKey = `otp:code:${phone}`;
    const storedOtp = await redis.get(otpKey);

    // Check OTP validity and match using timing-safe comparison
    // This prevents timing attacks that could reveal partial OTP
    if (!storedOtp) {
      logger.warn('OTP verification failed: OTP expired', {
        phone: phone.slice(-4),
      });
      return res.status(400).json(
        errorResponse(OTP_EXPIRED, 'OTP expired. Please request a new one.')
      );
    }

    let isValidOtp = false;
    try {
      // Use constant-time comparison to prevent timing attacks
      isValidOtp = crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(otp));
    } catch (err) {
      // timingSafeEqual throws if buffers don't match
      isValidOtp = false;
    }

    // Handle invalid or expired OTP (unified error message to prevent enumeration)
    if (!isValidOtp) {
      const attemptsKey = `otp:attempts:${phone}`;
      const attempts = await redis.incr(attemptsKey);

      // Set expiry on first attempt (1-hour window)
      if (attempts === 1) {
        await redis.expire(attemptsKey, 3600);
      }

      // Lock user after 3 failed attempts
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await redis.setex(lockoutKey, OTP_LOCKOUT_DURATION, '1');
        logger.warn('OTP verification failed: max attempts reached', {
          phone: phone.slice(-4),
        });
        return res.status(429).json(
          errorResponse(OTP_LOCKED, 'Too many failed attempts. Try again in 10 minutes.')
        );
      }

      logger.warn('OTP verification failed: invalid or expired OTP', {
        phone: phone.slice(-4),
        attempt: attempts,
        remaining: OTP_MAX_ATTEMPTS - attempts,
      });
      return res.status(400).json(
        errorResponse(
          INVALID_OTP,
          `OTP verification failed. ${OTP_MAX_ATTEMPTS - attempts} attempt${
            OTP_MAX_ATTEMPTS - attempts !== 1 ? 's' : ''
          } remaining.`
        )
      );
    }

    // OTP is valid. Delete it from Redis (one-time use)
    await redis.del(otpKey);
    await redis.del(`otp:attempts:${phone}`);

    // Get or create user profile
    // Query by phone to find existing user
    let profile = null;
    const { data: existingProfile, error: queryError } = await supabase
      .from('profiles')
      .select('id, phone, role, shop_id')
      .eq('phone', normalizedPhone)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 = "no rows found", which is expected for new users
      logger.error('Error querying user profile', {
        error: queryError.message,
        phone: phone.slice(-4),
      });
      throw new AppError(
        'INTERNAL_ERROR',
        'Database error while verifying user',
        500
      );
    }

    // If user doesn't exist, create new profile as customer
    if (!existingProfile) {
      const userId = uuidv4();
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          phone: normalizedPhone,
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, phone, role, shop_id')
        .single();

      if (createError) {
        logger.error('Error creating user profile', {
          error: createError.message,
          phone: phone.slice(-4),
        });
        throw new AppError(
          'INTERNAL_ERROR',
          'Failed to create user account',
          500
        );
      }

      profile = newProfile;
      logger.info('New user profile created', {
        userId: profile.id,
        phone: phone.slice(-4),
        role: profile.role,
      });
    } else {
      profile = existingProfile;
      logger.info('User authenticated', {
        userId: profile.id,
        phone: phone.slice(-4),
        role: profile.role,
      });
    }

    // Generate JWT token
    // Payload: { userId, phone, role, shopId? }
    const tokenPayload = {
      userId: profile.id,
      phone: profile.phone,
      role: profile.role,
    };

    // Include shopId if user is shop_owner
    if (profile.role === 'shop_owner' && profile.shop_id) {
      tokenPayload.shopId = profile.shop_id;
    }

    const token = generateToken(tokenPayload);

    logger.info('OTP verification successful', {
      userId: profile.id,
      phone: phone.slice(-4),
    });

    res.json(successResponse({
      userId: profile.id,
      phone: profile.phone,
      role: profile.role,
      shopId: profile.shop_id || undefined,
      token,
    }));
  } catch (err) {
    logger.error('Verify OTP error', { error: err.message });
    next(err);
  }
});

export default router;
