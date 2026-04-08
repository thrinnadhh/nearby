import { AppError, FORBIDDEN, SHOP_NOT_FOUND } from '../utils/errors.js';
import { supabase } from '../services/supabase.js';
import logger from '../utils/logger.js';

/**
 * Role-based access control middleware factory.
 * Checks if authenticated user has one of the allowed roles.
 * Must be used AFTER authenticate middleware.
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
export const roleGuard = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('roleGuard: No user context', { path: req.path });
      return next(new AppError(
        FORBIDDEN,
        'User context not found. Must be authenticated.',
        403
      ));
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Unauthorized role access attempt', {
        path: req.path,
        userRole,
        allowedRoles,
        userId: req.user.userId,
      });

      return next(new AppError(
        FORBIDDEN,
        `Your role '${userRole}' does not have access to this resource. Allowed roles: ${allowedRoles.join(', ')}`,
        403
      ));
    }

    logger.debug('Role check passed', {
      userId: req.user.userId,
      role: userRole,
      path: req.path,
    });

    next();
  };
};

/**
 * Verify that authenticated user owns the requested shop.
 * For shop_owner role, checks shopId matches request context.
 * Includes database verification (defense-in-depth) to prevent JWT forgery.
 * @returns {Function} Express middleware
 */
export const shopOwnerGuard = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('shopOwnerGuard: No user context', { path: req.path });
        return next(new AppError(
          FORBIDDEN,
          'User context not found.',
          403
        ));
      }

      // Shop owners must have a shopId in their JWT
      if (req.user.role === 'shop_owner' && !req.user.shopId) {
        logger.warn('Shop owner without shopId', { userId: req.user.userId });
        return next(new AppError(
          FORBIDDEN,
          'Shop owner profile incomplete.',
          403
        ));
      }

      // Check if shopId in params/query matches user's shopId
      const requestedShopId = req.params.shopId || req.query.shopId || req.body.shopId;
      if (req.user.role === 'shop_owner' && requestedShopId && requestedShopId !== req.user.shopId) {
        logger.warn('Shop owner attempting cross-shop access', {
          userId: req.user.userId,
          tokenShopId: req.user.shopId,
          requestedShopId,
          path: req.path,
        });

        return next(new AppError(
          FORBIDDEN,
          'You can only manage your own shop',
          403
        ));
      }

      // Extra validation: verify shop ownership in database (defense-in-depth)
      if (req.user.role === 'shop_owner' && requestedShopId) {
        const { data: shop, error } = await supabase
          .from('shops')
          .select('owner_id')
          .eq('id', requestedShopId)
          .single();

        if (error || !shop) {
          logger.warn('Shop not found during ownership verification', {
            requestedShopId,
            error: error?.message,
          });
          return next(new AppError(SHOP_NOT_FOUND, 'Shop does not exist', 404));
        }

        if (shop.owner_id !== req.user.userId) {
          logger.warn('Database ownership check failed (JWT manipulation attempt?)', {
            userId: req.user.userId,
            shopOwnerId: shop.owner_id,
            shopId: requestedShopId,
          });
          return next(new AppError(
            FORBIDDEN,
            'You do not own this shop',
            403
          ));
        }

        logger.debug('Shop ownership verified via database', {
          userId: req.user.userId,
          shopId: requestedShopId,
        });
      }

      next();
    } catch (err) {
      logger.error('Error in shopOwnerGuard', {
        message: err.message,
        stack: err.stack,
      });
      next(err);
    }
  };
};

/**
 * Verify admin role only.
 * @returns {Function} Express middleware
 */
export const adminGuard = () => {
  return roleGuard(['admin']);
};

/**
 * Verify customer role only.
 * @returns {Function} Express middleware
 */
export const customerGuard = () => {
  return roleGuard(['customer']);
};

/**
 * Verify delivery partner role only.
 * @returns {Function} Express middleware
 */
export const deliveryGuard = () => {
  return roleGuard(['delivery']);
};

export default roleGuard;
