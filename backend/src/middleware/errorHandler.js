import { AppError, INTERNAL_ERROR } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, message: err.message, path: req.path });
    return res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
  }

  logger.error({ message: err.message, stack: err.stack, path: req.path });
  return res.status(500).json(
    errorResponse(INTERNAL_ERROR, 'An unexpected error occurred')
  );
};

export default errorHandler;
