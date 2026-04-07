import jwt from 'jsonwebtoken';
import { AppError, UNAUTHORIZED, INVALID_TOKEN, TOKEN_EXPIRED } from '../utils/errors.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

/**
 * Authentication middleware.
 * Verifies JWT token from Authorization header and attaches user to req.user.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', { path: req.path });
      return next(new AppError(
        UNAUTHORIZED,
        'Authorization header missing or malformed',
        401
      ));
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      logger.debug('Token verified', { userId: decoded.userId, role: decoded.role });
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn('Token expired', { userId: err.decoded?.userId });
        return next(new AppError(
          TOKEN_EXPIRED,
          'Token has expired. Please login again.',
          401
        ));
      }

      logger.warn('Invalid token', { error: err.message });
      return next(new AppError(
        INVALID_TOKEN,
        'Invalid or malformed token',
        401
      ));
    }
  } catch (err) {
    logger.error('Authentication error', { error: err.message });
    next(err);
  }
};

/**
 * Generate JWT token.
 * @param {Object} payload - Token payload (userId, phone, role, shopId?)
 * @param {string} expiresIn - Expiry time (e.g., '7d')
 * @returns {string} JWT token
 */
export const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
    return token;
  } catch (err) {
    logger.error('Failed to generate JWT token', { error: err.message });
    throw err;
  }
};

/**
 * Verify JWT token and return decoded payload.
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {AppError} If token is invalid or expired
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(TOKEN_EXPIRED, 'Token has expired', 401);
    }
    throw new AppError(INVALID_TOKEN, 'Invalid token', 401);
  }
};

export default authenticate;
