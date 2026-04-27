import { Router } from 'express';
import Joi from 'joi';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  AppError,
  INVALID_OTP,
  OTP_EXPIRED,
  OTP_LOCKED,
  PARTNER_NOT_FOUND,
  VALIDATION_ERROR,
  RATE_LIMITED,
  UNAUTHORIZED,
  DUPLICATE_SHOP,
} from '../utils/errors.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { supabase } from '../services/supabase.js';
import { redis } from '../services/redis.js';
import { s3Client, uploadFile } from '../services/r2.js';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';

const router = Router();

// ────────────────────────────────────────────────────────────────────────────────
// UUID Validation Middleware
// ────────────────────────────────────────────────────────────────────────────────

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validatePartnerUUID(req, res, next) {
  const { id } = req.params;
  if (!uuidRegex.test(id)) {
    logger.warn('Invalid partner ID format', { id: id.slice(0, 8) });
    return res.status(400).json(
      errorResponse(VALIDATION_ERROR, 'Invalid partner ID format.')
    );
  }
  next();
}

// ────────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ────────────────────────────────────────────────────────────────────────────────

const partnerRegisterSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be 10 digits',
    }),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'OTP must be 6 digits',
    }),
});

const kycSubmitSchema = Joi.object({
  aadhaarLast4: Joi.string()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Aadhaar last 4 must be digits',
    }),
  aadhaarImageUrl: Joi.string().uri().required(),
  vehiclePhotoUrl: Joi.string().uri().required(),
}).unknown(false);

const bankDetailsSchema = Joi.object({
  bank_account_number: Joi.string()
    .pattern(/^\d{9,18}$/)
    .required()
    .messages({
      'string.pattern.base': 'Bank account must be 9-18 digits',
    }),
  bank_ifsc: Joi.string()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'IFSC must be 11 characters (e.g., HDFC0001234)',
    }),
  bank_account_name: Joi.string().min(3).max(60).required(),
}).unknown(false);

const vehicleDetailsSchema = Joi.object({
  vehicle_number: Joi.string()
    .pattern(/^[A-Z]{2}[\dA-Z]{2}[A-Z]{2}\d{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Vehicle number must be valid (e.g., DL01AB1234)',
    }),
}).unknown(false);

// ────────────────────────────────────────────────────────────────────────────────
// POST /auth/partner/register
// Register a new delivery partner with OTP verification
// Returns JWT token, userId, phone, role='delivery'
// ────────────────────────────────────────────────────────────────────────────────

router.post('/partner/register', async (req, res, next) => {
  try {
    const { error, value } = partnerRegisterSchema.validate(req.body);
    if (error) {
      logger.warn('Partner register validation failed', { error: error.message });
      return res.status(400).json(
        errorResponse(VALIDATION_ERROR, error.details[0].message)
      );
    }

    const { phone, otp } = value;
    const normalizedPhone = `+91${phone}`;

    logger.info('Partner registration attempt', { phone: phone.slice(-4) });

    // ─── Check OTP lockout ───────────────────────────────────────────────────────
    const lockoutKey = `otp:lockout:${phone}`;
    const isLocked = await redis.exists(lockoutKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey);
      logger.warn('Partner register blocked: user locked out', {
        phone: phone.slice(-4),
        ttlSeconds: ttl,
      });
      return res.status(429).json(
        errorResponse(OTP_LOCKED, `Too many failed attempts. Try again in ${ttl} seconds`)
      );
    }

    // ─── Verify OTP ──────────────────────────────────────────────────────────────
    const otpKey = `otp:code:${phone}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      logger.warn('Partner register: OTP expired or not found', { phone: phone.slice(-4) });
      return res.status(400).json(
        errorResponse(OTP_EXPIRED, 'OTP has expired. Request a new one.')
      );
    }

    if (storedOtp !== otp) {
      // Increment failed attempt counter
      const attemptsKey = `otp:attempts:${phone}`;
      const attempts = await redis.incr(attemptsKey);
      await redis.expire(attemptsKey, 600); // 10-minute window

      if (attempts >= 3) {
        // Lock out for 10 minutes
        await redis.setex(lockoutKey, 600, '1');
        logger.warn('Partner register: User locked out after 3 failed attempts', {
          phone: phone.slice(-4),
        });
        return res.status(429).json(
          errorResponse(OTP_LOCKED, 'Too many failed attempts. Try again in 10 minutes.')
        );
      }

      logger.warn('Partner register: Invalid OTP', {
        phone: phone.slice(-4),
        attemptsRemaining: 3 - attempts,
      });
      return res.status(400).json(
        errorResponse(INVALID_OTP, `Invalid OTP. ${3 - attempts} attempts remaining.`)
      );
    }

    // ─── Check for duplicate phone (delivery partner) ───────────────────────────
    const { data: existingPartner, error: partnerError } = await supabase
      .from('delivery_partners')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    if (existingPartner) {
      logger.warn('Partner register: Phone already registered as delivery partner', {
        phone: phone.slice(-4),
      });
      return res.status(409).json(
        errorResponse(DUPLICATE_SHOP, 'This phone is already registered as a delivery partner.')
      );
    }

    // ─── Check for existing profile/user ─────────────────────────────────────────
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('phone', normalizedPhone)
      .single();

    let userId;
    const now = new Date().toISOString();
    
    if (existingProfile) {
      // User exists — update role to delivery if customer
      userId = existingProfile.id;
      if (existingProfile.role !== 'delivery') {
        await supabase
          .from('profiles')
          .update({ role: 'delivery', updated_at: now })
          .eq('id', userId);
      }
      logger.info('Partner register: Updated existing customer profile to delivery', {
        userId,
      });
    } else {
      // Create new profile
      userId = uuidv4();
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          phone: normalizedPhone,
          role: 'delivery',
          display_name: null,
          created_at: now,
          updated_at: now,
        });

      if (profileError) {
        logger.error('Partner register: Failed to create profile', {
          error: profileError.message,
          phone: phone.slice(-4),
        });
        return res.status(500).json(
          errorResponse('PROFILE_CREATION_FAILED', 'Failed to create profile. Please try again.')
        );
      }

      logger.info('Partner register: Created new profile for delivery partner', { userId });
    }

    // ─── Create delivery_partners record ─────────────────────────────────────────
    const { error: partnerCreateError } = await supabase
      .from('delivery_partners')
      .insert({
        id: uuidv4(),
        user_id: userId,
        phone: normalizedPhone,
        kyc_status: 'pending_kyc',
        is_online: false,
        avg_rating: 0,
        total_deliveries: 0,
        updated_at: now,
      });

    if (partnerCreateError) {
      logger.error('Partner register: Failed to create delivery_partners record', {
        error: partnerCreateError.message,
        userId,
      });
      return res.status(500).json(
        errorResponse('PARTNER_CREATE_FAILED', 'Failed to register as delivery partner.')
      );
    }

    // ─── Clear OTP and attempts ──────────────────────────────────────────────────
    await redis.del(otpKey);
    await redis.del(`otp:attempts:${phone}`);

    // ─── Generate JWT token ─────────────────────────────────────────────────────
    const token = generateToken({
      userId,
      phone: normalizedPhone,
      role: 'delivery',
    });

    logger.info('Partner registration successful', { userId, phone: phone.slice(-4) });

    res.status(201).json(
      successResponse({
        userId,
        phone: normalizedPhone,
        role: 'delivery',
        token,
      })
    );
  } catch (err) {
    logger.error('Partner register error', { error: err.message });
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// POST /delivery-partners/:id/kyc
// Submit KYC documents (Aadhaar, vehicle photo)
// Images already uploaded to R2 by client
// ────────────────────────────────────────────────────────────────────────────────

router.post(
  '/delivery-partners/:id/kyc',
  authenticate,
  roleGuard(['delivery']),
  validatePartnerUUID,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { error, value } = kycSubmitSchema.validate(req.body);

      if (error) {
        logger.warn('KYC submit validation failed', { error: error.message });
        return res.status(400).json(
          errorResponse(VALIDATION_ERROR, error.details[0].message)
        );
      }

      const { aadhaarLast4, aadhaarImageUrl, vehiclePhotoUrl } = value;

      logger.info('KYC submit requested', { partnerId: id, userId: req.user.userId });

      // ─── Verify ownership ────────────────────────────────────────────────────
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (partnerError || !partner) {
        logger.warn('KYC submit: Partner not found', { id });
        return res.status(404).json(
          errorResponse(PARTNER_NOT_FOUND, 'Delivery partner not found.')
        );
      }

      if (partner.user_id !== req.user.userId) {
        logger.warn('KYC submit: Unauthorized access attempt', {
          partnerId: id,
          userId: req.user.userId,
        });
        return res.status(404).json(
          errorResponse(PARTNER_NOT_FOUND, 'Delivery partner not found.')
        );
      }

      // ─── Update delivery_partners with KYC URLs and status ──────────────────
      const { error: updateError } = await supabase
        .from('delivery_partners')
        .update({
          aadhaar_last4: aadhaarLast4,
          kyc_status: 'pending_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        logger.error('KYC submit: Failed to update partner', {
          error: updateError.message,
          partnerId: id,
        });
        return res.status(500).json(
          errorResponse('KYC_SUBMIT_FAILED', 'Failed to submit KYC. Please try again.')
        );
      }

      logger.info('KYC submitted successfully', { partnerId: id });

      res.json(
        successResponse({
          id,
          kyc_status: 'pending_review',
          message: 'KYC submitted. We will review and update your status within 24 hours.',
        })
      );
    } catch (err) {
      logger.error('KYC submit error', { error: err.message });
      next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────────
// PATCH /delivery-partners/:id
// Update bank account details
// ────────────────────────────────────────────────────────────────────────────────

router.patch(
  '/delivery-partners/:id/bank',
  authenticate,
  roleGuard(['delivery']),
  validatePartnerUUID,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { error, value } = bankDetailsSchema.validate(req.body);

      if (error) {
        logger.warn('Partner bank update validation failed', { error: error.message });
        return res.status(400).json(
          errorResponse(VALIDATION_ERROR, error.details[0].message)
        );
      }

      const { bank_account_number, bank_ifsc, bank_account_name } = value;

      logger.info('Partner bank update requested', { partnerId: id, userId: req.user.userId });

      // ─── Check authorization first (before database lookup for security) ─────
      if (id !== req.user.userId) {
        logger.warn('Partner bank update: Unauthorized access attempt', {
          partnerId: id,
          userId: req.user.userId,
        });
        return res.status(403).json(
          errorResponse(UNAUTHORIZED, 'Not authorized to update this partner.')
        );
      }

      // ─── Verify partner exists ────────────────────────────────────────────────
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('id', id)
        .single();

      if (partnerError || !partner) {
        logger.warn('Partner bank update: Partner not found', { id });
        return res.status(404).json(
          errorResponse(PARTNER_NOT_FOUND, 'Delivery partner not found.')
        );
      }

      // ─── Update bank details ────────────────────────────────────────────────
      const { error: updateError } = await supabase
        .from('delivery_partners')
        .update({
          bank_account_number,
          bank_ifsc,
          bank_account_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        logger.error('Partner update: Failed to update', {
          error: updateError.message,
          partnerId: id,
        });
        return res.status(500).json(
          errorResponse('PARTNER_UPDATE_FAILED', 'Failed to update profile. Please try again.')
        );
      }

      logger.info('Partner profile updated', { partnerId: id });

      res.json(
        successResponse({
          id,
          bank_account_number,
          bank_ifsc,
          bank_account_name,
        })
      );
    } catch (err) {
      logger.error('Partner update error', { error: err.message });
      next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────────
// PATCH /delivery-partners/:id/vehicle
// Update vehicle details (vehicle number, etc.)
// ────────────────────────────────────────────────────────────────────────────────

router.patch(
  '/delivery-partners/:id/vehicle',
  authenticate,
  roleGuard(['delivery']),
  validatePartnerUUID,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { error, value } = vehicleDetailsSchema.validate(req.body);

      if (error) {
        logger.warn('Partner vehicle update validation failed', { error: error.message });
        return res.status(400).json(
          errorResponse(VALIDATION_ERROR, error.details[0].message)
        );
      }

      const { vehicle_number } = value;

      logger.info('Partner vehicle update requested', { partnerId: id, userId: req.user.userId });

      // ─── Check authorization first (before database lookup for security) ─────
      if (id !== req.user.userId) {
        logger.warn('Partner vehicle update: Unauthorized access attempt', {
          partnerId: id,
          userId: req.user.userId,
        });
        return res.status(403).json(
          errorResponse(UNAUTHORIZED, 'Not authorized to update this partner.')
        );
      }

      // ─── Verify partner exists ────────────────────────────────────────────────
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('id', id)
        .single();

      if (partnerError || !partner) {
        logger.warn('Partner vehicle update: Partner not found', { id });
        return res.status(404).json(
          errorResponse(PARTNER_NOT_FOUND, 'Delivery partner not found.')
        );
      }

      // ─── Update vehicle details ──────────────────────────────────────────────
      const { error: updateError } = await supabase
        .from('delivery_partners')
        .update({
          vehicle_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        logger.error('Partner vehicle update: Failed to update', {
          error: updateError.message,
          partnerId: id,
        });
        return res.status(500).json(
          errorResponse('VEHICLE_UPDATE_FAILED', 'Failed to update vehicle details. Please try again.')
        );
      }

      logger.info('Partner vehicle updated', { partnerId: id });

      res.json(
        successResponse({
          id,
          vehicle_number,
        })
      );
    } catch (err) {
      logger.error('Partner vehicle update error', { error: err.message });
      next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────────
// GET /delivery-partners/:id/stats
// Get delivery partner statistics (total deliveries, earnings, ratings, etc.)
// ────────────────────────────────────────────────────────────────────────────────

router.get(
  '/delivery-partners/:id/stats',
  authenticate,
  roleGuard(['delivery']),
  validatePartnerUUID,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      logger.info('Partner stats requested', { partnerId: id, userId: req.user.userId });

      // ─── Check authorization first (before database lookup for security) ─────
      if (id !== req.user.userId) {
        logger.warn('Partner stats: Unauthorized access attempt', {
          partnerId: id,
          userId: req.user.userId,
        });
        return res.status(403).json(
          errorResponse(UNAUTHORIZED, 'Not authorized to view these stats.')
        );
      }

      // ─── Verify partner exists ────────────────────────────────────────────────
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select(
          'id, total_deliveries, avg_rating, total_earnings, active_orders'
        )
        .eq('id', id)
        .single();

      if (partnerError || !partner) {
        logger.warn('Partner stats: Partner not found', { id });
        return res.status(404).json(
          errorResponse(PARTNER_NOT_FOUND, 'Delivery partner not found.')
        );
      }

      logger.info('Partner stats retrieved', { partnerId: id });

      res.json(
        successResponse({
          totalDeliveries: partner.total_deliveries || 0,
          avgRating: partner.avg_rating || 0,
          totalEarnings: partner.total_earnings || 0,
          activeOrders: partner.active_orders || 0,
          earnings: partner.total_earnings || 0,
        })
      );
    } catch (err) {
      logger.error('Partner stats error', { error: err.message });
      next(err);
    }
  }
);

// PATCH /delivery-partners/:id/toggle-online
// Toggle online/offline status
// Rate limited: max 10 toggles per minute
// ────────────────────────────────────────────────────────────────────────────────

// Rate limiter for online toggle
async function toggleRateLimiter(partnerId, maxToggles = 10, windowSeconds = 60) {
  const key = `toggle:${partnerId}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  return current <= maxToggles;
}

router.patch(
  '/delivery-partners/:id/toggle-online',
  authenticate,
  roleGuard(['delivery']),
  validatePartnerUUID,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { is_online, latitude, longitude } = req.body;

      if (typeof is_online !== 'boolean') {
        return res.status(400).json(
          errorResponse(VALIDATION_ERROR, 'is_online must be a boolean')
        );
      }

      // Validate coordinates if provided
      if (is_online && (latitude !== undefined || longitude !== undefined)) {
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return res.status(400).json(
            errorResponse(VALIDATION_ERROR, 'Latitude and longitude must be numbers')
          );
        }

        // Validate India geographic bounds
        const INDIA_LAT_MIN = 8.4;
        const INDIA_LAT_MAX = 37.6;
        const INDIA_LON_MIN = 68.7;
        const INDIA_LON_MAX = 97.4;

        if (
          latitude < INDIA_LAT_MIN ||
          latitude > INDIA_LAT_MAX ||
          longitude < INDIA_LON_MIN ||
          longitude > INDIA_LON_MAX
        ) {
          return res.status(400).json(
            errorResponse(VALIDATION_ERROR, 'Coordinates must be within India bounds')
          );
        }
      }

      logger.info('Partner toggle-online requested', {
        partnerId: id,
        userId: req.user.userId,
        isOnline: is_online,
        latitude,
        longitude,
      });

      // ─── Check authorization first (before database lookup for security) ─────
      if (id !== req.user.userId) {
        logger.warn('Partner toggle: Unauthorized access attempt', {
          partnerId: id,
          userId: req.user.userId,
        });
        return res.status(403).json(
          errorResponse(UNAUTHORIZED, 'Not authorized to toggle this partner.')
        );
      }

      // ─── Check rate limit ────────────────────────────────────────────────────
      const allowed = await toggleRateLimiter(id);
      if (!allowed) {
        logger.warn('Partner toggle-online rate limited', { partnerId: id });
        return res.status(429).json(
          errorResponse(RATE_LIMITED, 'Too many toggle requests. Please slow down.')
        );
      }

      // ─── Verify partner exists and get KYC status ─────────────────────────────
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('id, kyc_status')
        .eq('id', id)
        .single();

      if (partnerError || !partner) {
        logger.warn('Partner toggle: Partner not found', { id });
        return res.status(404).json(
          errorResponse(PARTNER_NOT_FOUND, 'Delivery partner not found.')
        );
      }

      // ─── Check KYC status ────────────────────────────────────────────────────
      if (is_online && partner.kyc_status !== 'approved') {
        logger.warn('Partner toggle: Cannot go online — KYC not approved', {
          partnerId: id,
          kycStatus: partner.kyc_status,
        });
        return res.status(403).json(
          errorResponse(
            'KYC_NOT_APPROVED',
            'You must complete KYC verification before going online.'
          )
        );
      }

      // ─── Store location in Redis if going online ─────────────────────────────
      if (is_online && latitude !== undefined && longitude !== undefined) {
        const locationKey = `delivery:${id}:location`;
        await redis.setex(
          locationKey,
          86400, // 24 hours TTL
          JSON.stringify({
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
          })
        );
        logger.info('Partner location stored in Redis', { partnerId: id });
      }

      // ─── Update online status ────────────────────────────────────────────────
      const updateData = {
        is_online,
        last_online_at: is_online ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      // Update latitude and longitude if provided
      if (latitude !== undefined && longitude !== undefined) {
        updateData.latitude = latitude;
        updateData.longitude = longitude;
      }

      const { error: updateError } = await supabase
        .from('delivery_partners')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        logger.error('Partner toggle: Failed to update', {
          error: updateError.message,
          partnerId: id,
        });
        return res.status(500).json(
          errorResponse('TOGGLE_FAILED', 'Failed to update online status. Please try again.')
        );
      }

      logger.info('Partner online status toggled', {
        partnerId: id,
        isOnline: is_online,
      });

      res.json(
        successResponse({
          id,
          is_online,
          last_online_at: is_online ? new Date().toISOString() : null,
        })
      );
    } catch (err) {
      logger.error('Partner toggle error', { error: err.message });
      next(err);
    }
  }
);

export default router;
