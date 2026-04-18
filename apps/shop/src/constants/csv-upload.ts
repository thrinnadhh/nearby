/**
 * CSV Upload Constants
 * Centralized configuration for file limits, batch sizes, and timeouts
 */

/**
 * File Upload Constraints
 */
export const CSV_FILE_CONSTRAINTS = {
  /** Maximum file size in bytes (5 MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: ['.csv'],
  
  /** Human-readable size limit for error messages */
  MAX_FILE_SIZE_MB: 5,
} as const;

/**
 * Batch Processing Configuration
 */
export const CSV_BATCH_CONFIG = {
  /** Maximum products per batch (backend limit) */
  MAX_BATCH_SIZE: 100,
  
  /** Minimum products required per batch */
  MIN_BATCH_SIZE: 1,
  
  /** Recommended safe batch size (slightly below max to account for metadata) */
  SAFE_BATCH_SIZE: 95,
} as const;

/**
 * Upload Retry Configuration
 */
export const CSV_UPLOAD_RETRY = {
  /** Maximum retry attempts per batch */
  MAX_RETRIES: 3,
  
  /** Timeout per request in milliseconds (30 seconds) */
  REQUEST_TIMEOUT_MS: 30 * 1000,
  
  /** Backoff multiplier for exponential retry (1s, 2s, 4s) */
  BACKOFF_MULTIPLIER: 2,
  
  /** Initial retry delay in milliseconds */
  INITIAL_RETRY_DELAY_MS: 1000,
} as const;

/**
 * Idempotency Configuration
 */
export const CSV_IDEMPOTENCY = {
  /** Prefix for idempotency keys */
  KEY_PREFIX: 'bulk',
  
  /** Separator for components of idempotency key */
  KEY_SEPARATOR: '-',
  
  /** TTL for idempotency keys in backend (24 hours) */
  KEY_TTL_HOURS: 24,
} as const;

/**
 * UI/UX Configuration
 */
export const CSV_UI_CONFIG = {
  /** Minimum delay before showing progress bar (ms) */
  PROGRESS_DELAY_MS: 300,
  
  /** Update frequency for progress (ms) */
  PROGRESS_UPDATE_INTERVAL_MS: 500,
  
  /** Animation duration for transitions (ms) */
  ANIMATION_DURATION_MS: 300,
} as const;

/**
 * Validation Configuration
 */
export const CSV_VALIDATION = {
  /** Minimum product name length */
  NAME_MIN_LENGTH: 2,
  
  /** Maximum product name length */
  NAME_MAX_LENGTH: 100,
  
  /** Maximum description length */
  DESCRIPTION_MAX_LENGTH: 500,
  
  /** Minimum price in paise (₹1.00) */
  MIN_PRICE_PAISE: 100,
  
  /** Minimum stock quantity */
  MIN_STOCK_QTY: 0,
} as const;

/**
 * Generate idempotency key for batch upload
 * Format: bulk-{timestamp}-{batchNumber}
 *
 * @param batchNumber - Current batch number (1-indexed)
 * @returns Idempotency key string
 */
export function generateIdempotencyKey(batchNumber: number): string {
  return `${CSV_IDEMPOTENCY.KEY_PREFIX}${CSV_IDEMPOTENCY.KEY_SEPARATOR}${Date.now()}${CSV_IDEMPOTENCY.KEY_SEPARATOR}${batchNumber}`;
}

/**
 * Calculate number of batches needed for given product count
 *
 * @param productCount - Total number of products
 * @param batchSize - Batch size (defaults to MAX_BATCH_SIZE)
 * @returns Number of batches needed
 */
export function calculateBatchCount(
  productCount: number,
  batchSize: number = CSV_BATCH_CONFIG.MAX_BATCH_SIZE
): number {
  return Math.ceil(productCount / batchSize);
}

/**
 * Calculate retry delay with exponential backoff
 * Formula: initialDelay * (backoffMultiplier ^ attemptNumber)
 *
 * @param attemptNumber - Current attempt (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(attemptNumber: number): number {
  return (
    CSV_UPLOAD_RETRY.INITIAL_RETRY_DELAY_MS *
    Math.pow(CSV_UPLOAD_RETRY.BACKOFF_MULTIPLIER, attemptNumber)
  );
}

/**
 * Convert file size in bytes to human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Human-readable size string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
