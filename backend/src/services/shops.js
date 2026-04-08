import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import {
  AppError,
  DUPLICATE_SHOP,
  INVALID_COORDINATES,
  INTERNAL_ERROR,
  SHOP_NOT_FOUND,
  UNAUTHORIZED,
  FILE_TOO_LARGE,
  FILE_TOO_SMALL,
  INVALID_FILE_TYPE,
  UPLOAD_FAILED,
  VALIDATION_ERROR,
} from '../utils/errors.js';
import { supabase } from './supabase.js';
import { uploadFile, getSignedFileUrl } from './r2.js';
import { redis } from './redis.js';

const MIN_FILE_SIZE = 1 * 1024; // 1 KB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPE = 'application/pdf';
const KYC_BUCKET = process.env.R2_KYC_BUCKET || 'nearby-kyc';
const KYC_IDEMPOTENCY_TTL = 300; // 5 minutes in seconds

/**
 * ShopService — encapsulates all shop business logic.
 * Provides methods for shop creation, retrieval, updates, and KYC upload.
 */
class ShopService {
  /**
   * Check if a user already owns a shop.
   * @private
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user already owns a shop
   */
  static async checkOwnerHasShop(userId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "no rows found"
      logger.error('Error querying user profile', {
        error: error.message,
        userId,
      });
      throw new AppError(
        INTERNAL_ERROR,
        'Database error while checking shop ownership',
        500
      );
    }

    return profile && profile.shop_id !== null;
  }

  /**
   * Create a new shop for a shop owner.
   * Validates that owner doesn't already have a shop.
   * Initializes shop with is_verified=false, trust_score=50.0, is_open=true.
   * Updates user profile to link shopId.
   *
   * @param {string} userId - User ID (must be shop_owner role)
   * @param {Object} shopData - Shop creation data
   * @param {string} shopData.name - Shop name (3-100 chars)
   * @param {string} shopData.description - Shop description (10-500 chars)
   * @param {number} shopData.latitude - Latitude (8°-35°N)
   * @param {number} shopData.longitude - Longitude (68°-97°E)
   * @param {string} shopData.category - Shop category (enum)
   * @param {string} [shopData.phone] - Optional phone number (+91XXXXXXXXXX)
   * @returns {Promise<Object>} Created shop object
   * @throws {AppError} If duplicate shop, invalid coordinates, or database error
   */
  static async create(userId, shopData) {
    const {
      name,
      description,
      latitude,
      longitude,
      category,
      phone,
    } = shopData;

    logger.info('Creating shop for user', {
      userId,
      shopName: name,
      category,
    });

    // 1. Check if user already owns a shop (duplicate prevention)
    const userHasShop = await this.checkOwnerHasShop(userId);
    if (userHasShop) {
      logger.warn('Shop owner attempted to create duplicate shop', {
        userId,
      });
      throw new AppError(
        DUPLICATE_SHOP,
        'You already own a shop. Each user can own only one shop.',
        409
      );
    }

    // 2. Validate coordinates are within India bounds
    if (latitude < 8.0 || latitude > 35.0) {
      logger.warn('Invalid latitude for shop creation', {
        latitude,
        userId,
      });
      throw new AppError(
        INVALID_COORDINATES,
        'Latitude must be within India bounds (8°N–35°N)',
        400
      );
    }

    if (longitude < 68.0 || longitude > 97.0) {
      logger.warn('Invalid longitude for shop creation', {
        longitude,
        userId,
      });
      throw new AppError(
        INVALID_COORDINATES,
        'Longitude must be within India bounds (68°E–97°E)',
        400
      );
    }

    try {
      // 3. Create shop in shops table
      // Using immutability: create new object with shop data
      const shopId = uuidv4();
      const now = new Date().toISOString();

      const shopRecord = {
        id: shopId,
        owner_id: userId,
        name: name.trim(),
        category,
        phone: phone || null,
        latitude,
        longitude,
        description: description.trim(),
        is_open: true,
        is_verified: false,
        trust_score: 50.0,
        created_at: now,
        updated_at: now,
      };

      const { data: createdShop, error: shopError } = await supabase
        .from('shops')
        .insert(shopRecord)
        .select()
        .single();

      if (shopError) {
        logger.error('Error creating shop record', {
          error: shopError.message,
          userId,
          shopName: name,
        });
        throw new AppError(
          INTERNAL_ERROR,
          'Failed to create shop',
          500
        );
      }

      // 4. Update user profile to link shopId
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          shop_id: shopId,
          updated_at: now,
        })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        logger.error('Error updating profile with shopId', {
          error: profileError.message,
          userId,
          shopId,
        });
        throw new AppError(
          INTERNAL_ERROR,
          'Failed to link shop to profile',
          500
        );
      }

      logger.info('Shop created successfully', {
        shopId: createdShop.id,
        userId,
        shopName: createdShop.name,
        category: createdShop.category,
      });

      // 5. Return shop object (immutably constructed response)
      return {
        id: createdShop.id,
        name: createdShop.name,
        category: createdShop.category,
        description: createdShop.description,
        phone: createdShop.phone,
        latitude: createdShop.latitude,
        longitude: createdShop.longitude,
        isOpen: createdShop.is_open,
        isVerified: createdShop.is_verified,
        trustScore: createdShop.trust_score,
        createdAt: createdShop.created_at,
        updatedAt: createdShop.updated_at,
      };
    } catch (err) {
      // Re-throw AppError as-is
      if (err.isOperational) {
        throw err;
      }

      // Catch unexpected errors
      logger.error('Unexpected error creating shop', {
        error: err.message,
        userId,
        stack: err.stack,
      });
      throw new AppError(
        INTERNAL_ERROR,
        'An unexpected error occurred while creating shop',
        500
      );
    }
  }

  /**
   * Upload KYC document for a shop.
   * Validates file type (PDF only) and size (1-10 MB).
   * Uses idempotency key to prevent duplicate uploads.
   * Uploads to Cloudflare R2 private bucket.
   * Updates shop record with signed KYC document URL and status.
   *
   * @param {string} userId - User ID (must be shop owner)
   * @param {string} shopId - Shop ID (must belong to user)
   * @param {Object} file - Multer file object
   * @param {Buffer} file.buffer - File content
   * @param {string} file.mimetype - File MIME type
   * @param {number} file.size - File size in bytes
   * @param {string} file.originalname - Original filename
   * @param {string} idempotencyKey - Idempotency key (UUID) for deduplication
   * @returns {Promise<Object>} KYC upload response
   * @throws {AppError} If file invalid, shop not found, upload fails, or missing idempotency key
   */
  static async uploadKYC(userId, shopId, file, idempotencyKey) {
    logger.info('Starting KYC document upload', {
      userId,
      shopId,
      filename: file?.originalname,
      size: file?.size,
      hasIdempotencyKey: !!idempotencyKey,
    });

    try {
      // 0. Validate idempotency key
      if (!idempotencyKey) {
        logger.warn('KYC upload: Missing idempotency key', { userId, shopId });
        throw new AppError(
          VALIDATION_ERROR,
          'idempotency-key header is required',
          400
        );
      }

      // 0.5. Check if already processed (idempotency)
      const cacheKey = `kyc:${shopId}:${idempotencyKey}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info('KYC upload idempotency hit, returning cached response', {
          shopId,
          idempotencyKey,
        });
        return JSON.parse(cached);
      }

      // 1. Validate file exists and is provided
      if (!file) {
        logger.warn('KYC upload: No file provided', { userId, shopId });
        throw new AppError(
          INVALID_FILE_TYPE,
          'No file provided. Please upload a PDF document.',
          400
        );
      }

      // 2. Validate file MIME type (must be PDF)
      if (file.mimetype !== ALLOWED_MIME_TYPE) {
        logger.warn('KYC upload: Invalid file type', {
          userId,
          shopId,
          mimetype: file.mimetype,
        });
        throw new AppError(
          INVALID_FILE_TYPE,
          'Only PDF files are accepted. Please upload a PDF document.',
          400
        );
      }

      // 3. Fetch shop from database to verify ownership
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, name, owner_id')
        .eq('id', shopId)
        .single();

      if (shopError || !shop) {
        logger.warn('KYC upload: Shop not found', {
          userId,
          shopId,
          error: shopError?.message,
        });
        throw new AppError(
          SHOP_NOT_FOUND,
          'Shop does not exist.',
          404
        );
      }

      // 4. Verify user owns this shop (additional defense-in-depth check)
      if (shop.owner_id !== userId) {
        logger.warn('KYC upload: User does not own shop', {
          userId,
          shopId,
          shopOwnerId: shop.owner_id,
        });
        throw new AppError(
          UNAUTHORIZED,
          'You are not authorized to upload KYC for this shop.',
          403
        );
      }

      // 5. Generate unique key for R2 storage
      // Format: kyc/{shopId}/{timestamp}-{randomId}.pdf
      const timestamp = Date.now();
      const randomId = uuidv4().slice(0, 8);
      const r2Key = `kyc/${shopId}/${timestamp}-${randomId}.pdf`;

      logger.debug('Generated R2 key for KYC upload', {
        key: r2Key,
        shopId,
      });

      // 6. Upload file to R2 private bucket
      await uploadFile(
        KYC_BUCKET,
        r2Key,
        file.buffer,
        {
          contentType: ALLOWED_MIME_TYPE,
          shopId,
          uploadedBy: userId,
        }
      );

      logger.info('KYC file uploaded to R2', {
        shopId,
        key: r2Key,
        bucket: KYC_BUCKET,
      });

      // 7. Generate signed URL for the uploaded file (5-minute TTL)
      const signedUrl = await getSignedFileUrl(
        KYC_BUCKET,
        r2Key,
        300 // 5 minutes in seconds
      );

      logger.debug('Generated signed URL for KYC document', {
        shopId,
        expiresIn: 300,
      });

      // 8. Update shop record with signed KYC document URL and status
      const now = new Date().toISOString();
      const expiryTime = new Date(Date.now() + 300 * 1000).toISOString();

      const { data: updatedShop, error: updateError } = await supabase
        .from('shops')
        .update({
          kyc_document_url: signedUrl,
          kyc_document_expires_at: expiryTime,
          kyc_status: 'kyc_submitted',
          updated_at: now,
        })
        .eq('id', shopId)
        .select()
        .single();

      if (updateError) {
        logger.error('KYC upload: Failed to update shop record', {
          error: updateError.message,
          shopId,
          userId,
        });
        throw new AppError(
          INTERNAL_ERROR,
          'Failed to save KYC document information.',
          500
        );
      }

      logger.info('KYC document upload completed successfully', {
        shopId,
        userId,
        kycStatus: updatedShop.kyc_status,
      });

      // 9. Construct immutable response
      const result = {
        shopId: updatedShop.id,
        kycDocumentUrl: signedUrl,
        kycStatus: updatedShop.kyc_status,
        updatedAt: updatedShop.updated_at,
      };

      // 10. Cache result for idempotency (5 minutes)
      await redis.setex(cacheKey, KYC_IDEMPOTENCY_TTL, JSON.stringify(result));

      return result;
    } catch (err) {
      // Re-throw AppError as-is
      if (err.isOperational) {
        throw err;
      }

      // Catch unexpected errors
      logger.error('Unexpected error during KYC upload', {
        error: err.message,
        userId,
        shopId,
        stack: err.stack,
      });
      throw new AppError(
        UPLOAD_FAILED,
        'An unexpected error occurred while uploading KYC document.',
        500
      );
    }
  }
}

export default ShopService;
