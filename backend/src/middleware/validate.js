import { AppError, VALIDATION_ERROR } from '../utils/errors.js';
import logger from '../utils/logger.js';

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

      return next(new AppError(
        VALIDATION_ERROR,
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
