import multer from 'multer';
import logger from '../utils/logger.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_FILE_SIZE = 1 * 1024; // 1 KB

/**
 * Configure multer for file uploads.
 * Stores files in memory (not disk) for direct R2 upload.
 * Max file size: 10 MB.
 * Validates MIME type (PDF only) and file size bounds.
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

export default upload;
