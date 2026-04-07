import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import {
  AppError,
  DUPLICATE_SHOP,
  INVALID_COORDINATES,
  INTERNAL_ERROR,
} from '../utils/errors.js';
import { supabase } from './supabase.js';

/**
 * ShopService — encapsulates all shop business logic.
 * Provides methods for shop creation, retrieval, and updates.
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
}

export default ShopService;
