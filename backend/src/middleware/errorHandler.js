import { MulterError } from 'multer';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Handle multer file size errors
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    logger.warn('File too large error', {
      code: err.code,
      message: err.message,
      path: req.path,
    });
    return res.status(413).json(
      errorResponse('FILE_TOO_LARGE', 'File is too large. Maximum size is 10 MB.')
    );
  }

  // Handle other multer errors (invalid MIME, field name, etc.)
  if (err instanceof MulterError) {
    logger.warn('Multer validation error', {
      code: err.code,
      message: err.message,
      path: req.path,
    });
    return res.status(400).json(
      errorResponse('INVALID_FILE_TYPE', 'Invalid file. ' + err.message)
    );
  }

  // Handle custom errors thrown by multer fileFilter
  if (err && err.message && err.message.includes('Only PDF files allowed')) {
    logger.warn('Multer PDF validation failed', { message: err.message });
    return res.status(400).json(
      errorResponse('INVALID_FILE_TYPE', err.message)
    );
  }

  if (err && err.message && err.message.includes('File too small')) {
    logger.warn('Multer size validation failed (too small)', { message: err.message });
    return res.status(400).json(
      errorResponse('FILE_TOO_SMALL', err.message)
    );
  }

  if (err && err.message && err.message.includes('File exceeds maximum')) {
    logger.warn('Multer size validation failed (too large)', { message: err.message });
    return res.status(413).json(
      errorResponse('FILE_TOO_LARGE', 'File is too large. Maximum size is 10 MB.')
    );
  }

  // Handle AppError (custom application errors)
  if (err instanceof AppError) {
    logger.warn('Application error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
    });
    return res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
  }

  // Handle unexpected errors
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });
  return res.status(500).json(
    errorResponse(INTERNAL_ERROR, 'An unexpected error occurred. Please try again later.')
  );
};

export default errorHandler;
