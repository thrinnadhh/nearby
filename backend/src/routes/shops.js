import { Router } from 'express';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard, shopOwnerGuard } from '../middleware/roleGuard.js';
import { rateLimit } from '../middleware/rateLimit.js';
import upload from '../middleware/multer.js';
import { createShopSchema } from '../utils/validators.js';
import ShopService from '../services/shops.js';

const router = Router();

/**
 * POST /api/v1/shops
 * Create a new shop for the authenticated shop owner.
 * Requires: Authentication + shop_owner role
 * Request body:
 *   {
 *     name: string (3-100),
 *     description: string (10-500),
 *     latitude: number (8-35),
 *     longitude: number (68-97),
 *     category: enum,
 *     phone?: string (+91XXXXXXXXXX)
 *   }
 * Response: 201 with created shop object
 */
router.post('/', authenticate, roleGuard(['shop_owner']), async (req, res, next) => {
  try {
    // 1. Validate request body
    const { error, value } = createShopSchema.validate(req.body);
    if (error) {
      logger.warn('Create shop validation failed', {
        error: error.message,
        userId: req.user.userId,
      });
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', error.details[0].message)
      );
    }

    // 2. Call service to create shop
    const shop = await ShopService.create(req.user.userId, value);

    // 3. Return 201 with created shop
    logger.info('Shop creation endpoint success', {
      shopId: shop.id,
      userId: req.user.userId,
    });

    res.status(201).json(successResponse(shop));
  } catch (err) {
    // 4. Forward error to error handler middleware
    logger.error('Create shop endpoint error', {
      error: err.message,
      userId: req.user?.userId,
    });
    next(err);
  }
});

/**
 * POST /api/v1/shops/:shopId/kyc
 * Upload KYC document for a shop.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Rate limited: 10 uploads per hour per user
 * Request: multipart/form-data with 'document' field (PDF, 1-10 MB)
 * Headers: idempotency-key (UUID) for deduplication
 * Response: 201 with KYC status and signed URL
 */
router.post(
  '/:shopId/kyc',
  authenticate,
  rateLimit('kyc-upload', 10, 3600),
  upload.single('document'),
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const idempotencyKey = req.headers['idempotency-key'];

      logger.debug('KYC upload request received', {
        shopId,
        userId: req.user.userId,
        hasFile: !!req.file,
        hasIdempotencyKey: !!idempotencyKey,
      });

      // 1. Check file was uploaded
      if (!req.file) {
        logger.warn('KYC upload: No file in request', {
          shopId,
          userId: req.user.userId,
        });
        return res.status(400).json(
          errorResponse('INVALID_FILE_TYPE', 'No file provided. Please upload a PDF document.')
        );
      }

      // 2. Call service to upload KYC
      const result = await ShopService.uploadKYC(
        req.user.userId,
        shopId,
        req.file,
        idempotencyKey
      );

      // 3. Return 201 with KYC response
      logger.info('KYC upload endpoint success', {
        shopId,
        userId: req.user.userId,
        kycStatus: result.kycStatus,
      });

      res.status(201).json(successResponse(result));
    } catch (err) {
      // 4. Forward error to error handler middleware
      logger.error('KYC upload endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

export default router;
