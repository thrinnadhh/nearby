import { AppError, VALIDATION_ERROR } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Map field names to specific error codes for better client error handling.
 * This allows tests and clients to handle specific validation errors differently.
 */
const fieldErrorCodeMap = {
  threshold: 'INVALID_THRESHOLD',
  page: 'INVALID_PAGE',
  limit: 'INVALID_LIMIT',
  sortBy: 'INVALID_SORT_BY',
  offset: 'INVALID_OFFSET',
};

/**
 * Validation middleware factory.
 * Validates request body against a Joi schema.
 * @param {Object} schema - Joi schema
 * @param {string} source - Where to validate: 'body', 'query', 'params'
 * @returns {Function} Express middleware
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map(d => d.message).join(', ');
      logger.warn('Validation error', {
        path: req.path,
        source,
        messages,
      });

      // Determine error code based on first failed field
      const firstField = error.details[0]?.path?.[0];
      const errorCode = fieldErrorCodeMap[firstField] || VALIDATION_ERROR;

      return next(new AppError(
        errorCode,
        `Validation failed: ${messages}`,
        400,
        { fields: error.details.map(d => ({ field: d.path.join('.'), message: d.message })) }
      ));
    }

    // Replace request data with validated and sanitized value
    req[source] = value;
    next();
  };
};

export default validate;
