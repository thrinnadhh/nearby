import multer from 'multer';
import logger from '../utils/logger.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_FILE_SIZE = 1 * 1024; // 1 KB

/**
 * Default upload — PDF only (KYC documents).
 * Stores files in memory for direct R2 upload.
 * Max file size: 10 MB, min: 1 KB.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    logger.debug('Multer fileFilter processing', {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Validate MIME type (PDF only)
    if (file.mimetype !== 'application/pdf') {
      logger.warn('Rejected non-PDF file', {
        mimetype: file.mimetype,
        filename: file.originalname,
      });
      return cb(new Error(`Only PDF files allowed. Received: ${file.mimetype}`), false);
    }

    // Validate file size bounds (1 KB - 10 MB)
    if (file.size < MIN_FILE_SIZE) {
      logger.warn('Rejected undersized file', { size: file.size });
      return cb(new Error('File too small (minimum 1 KB)'), false);
    }
    if (file.size > MAX_FILE_SIZE) {
      logger.warn('Rejected oversized file', { size: file.size });
      return cb(new Error('File exceeds maximum size (10 MB)'), false);
    }

    logger.debug('File passed multer validation', {
      fieldname: file.fieldname,
      size: file.size,
    });
    cb(null, true);
  },
});

/**
 * Image upload — JPEG, PNG, WEBP only (product images).
 * Stores files in memory for Sharp processing before R2 upload.
 * Max file size: 5 MB.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      logger.warn('Rejected non-image file for product upload', {
        mimetype: file.mimetype,
        filename: file.originalname,
      });
      return cb(new Error('Only JPEG, PNG, or WEBP images are allowed'), false);
    }
    logger.debug('Image file passed multer validation', {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
    });
    cb(null, true);
  },
});

/**
 * CSV upload — CSV/plain text only (bulk product import).
 * Stores files in memory for csv-parse processing.
 * Max file size: 2 MB.
 */
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (!allowed.includes(file.mimetype)) {
      logger.warn('Rejected non-CSV file for bulk upload', {
        mimetype: file.mimetype,
        filename: file.originalname,
      });
      return cb(new Error('Only CSV files are allowed'), false);
    }
    logger.debug('CSV file passed multer validation', {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
    });
    cb(null, true);
  },
});

export default upload;
