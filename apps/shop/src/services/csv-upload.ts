/**
 * CSV Upload Service — API calls for bulk product uploads
 *
 * ## Features
 * - Batch processing with 100 products max per batch
 * - 207 Multi-Status partial success handling
 * - Idempotency key generation for deduplication
 * - Comprehensive error handling with retry guidance
 * - Real-time progress callbacks
 *
 * ## Error Handling
 * Errors are sanitized to avoid leaking technical details:
 * - User sees: "Upload timeout. Please retry."
 * - Logs contain: Full stack trace, request details, response codes
 *
 * ## Examples
 * ```typescript
 * const result = await uploadProductBatch(products, 1);
 * if (result.statusCode === 207) {
 *   console.log(`Success: ${result.data.successful.length}, Failed: ${result.data.failed.length}`);
 * }
 * ```
 */

import axios from 'axios';
import { client } from '@/services/api';
import { PRODUCTS_ENDPOINTS } from '@/constants/api';
import { useAuthStore } from '@/store/auth';
import {
  CsvProductRow,
  BatchUploadResponse,
  ProductUploadResult,
} from '@/types/csv';
import {
  CSV_BATCH_CONFIG,
  CSV_UPLOAD_RETRY,
  generateIdempotencyKey,
} from '@/constants/csv-upload';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

/**
 * Sanitize error message for user display
 * Removes technical details and provides user-friendly guidance
 *
 * @param error - Original error object
 * @returns User-friendly error message
 */
function sanitizeErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Network errors
    if (!error.response) {
      return 'Network connection lost. Please check your internet and retry.';
    }

    // Server errors - don't expose internal details
    if (error.response.status >= 500) {
      return 'Server error. Please try again in a few moments.';
    }

    // Auth errors
    if (error.response.status === 401) {
      return 'Your session expired. Please login again.';
    }

    // Payload errors
    if (error.response.status === 413) {
      return 'Batch is too large. Please upload fewer products at once.';
    }

    // Validation errors - can show more details
    if (error.response.status === 422) {
      const details = (error.response?.data as { message?: string })?.message;
      return details || 'Some products in the batch are invalid.';
    }

    // Timeout
    if (error.code === 'ECONNABORTED') {
      return 'Upload timeout. Please retry.';
    }
  }

  if (error instanceof Error) {
    // Don't expose system errors directly
    logger.debug('Original error for reference', { error: error.message });
    return 'An unexpected error occurred. Please try again.';
  }

  return 'An unexpected error occurred.';
}

/**
 * Extract error details for logging (not user display)
 */
function extractLogDetails(error: unknown): Record<string, unknown> {
  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status,
      method: error.config?.method,
      url: error.config?.url,
      message: error.message,
      responseData: error.response?.data,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { error: String(error) };
}

/**
 * Upload batch of products via multipart/form-data
 * Backend handles idempotency and deduplication
 * Returns 207 Multi-Status for partial success
 *
 * ## Batch Constraints
 * - Minimum: 1 product
 * - Maximum: 100 products
 * - Timeout: 30 seconds per request
 *
 * @param products - Array of validated product rows (max 100)
 * @param batchNumber - Current batch number (1-indexed, for idempotency key)
 * @returns BatchUploadResponse with successful and failed products
 * @throws AppError if batch validation fails or network error occurs
 */
export async function uploadProductBatch(
  products: CsvProductRow[],
  batchNumber: number = 1
): Promise<BatchUploadResponse> {
  try {
    // Validate batch
    if (!products || products.length === 0) {
      throw new AppError(
        'EMPTY_BATCH',
        'No products to upload'
      );
    }

    if (products.length > CSV_BATCH_CONFIG.MAX_BATCH_SIZE) {
      throw new AppError(
        'BATCH_TOO_LARGE',
        `Batch size cannot exceed ${CSV_BATCH_CONFIG.MAX_BATCH_SIZE} products`
      );
    }

    // Verify shop authentication
    const shopId = useAuthStore.getState().shopId;
    if (!shopId) {
      throw new AppError(
        'SHOP_ID_MISSING',
        'Authentication required'
      );
    }

    // Prepare upload
    const formData = new FormData();
    formData.append('products', JSON.stringify(products));

    const idempotencyKey = generateIdempotencyKey(batchNumber);
    formData.append('idempotencyKey', idempotencyKey);

    const url = PRODUCTS_ENDPOINTS.BULK_CREATE.replace(':shopId', shopId);

    logger.info('Starting batch upload', {
      batch: batchNumber,
      productCount: products.length,
      idempotencyKey,
    });

    // Execute upload with timeout
    const { data, status } = await client.post<BatchUploadResponse>(
      url,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: CSV_UPLOAD_RETRY.REQUEST_TIMEOUT_MS,
      }
    );

    // Log result
    const isPartialSuccess = status === 207 || data?.statusCode === 207;
    if (isPartialSuccess) {
      logger.warn('Batch upload partial success', {
        batch: batchNumber,
        successful: data?.data?.successful?.length ?? 0,
        failed: data?.data?.failed?.length ?? 0,
        idempotencyKey,
      });
    } else {
      logger.info('Batch upload successful', {
        batch: batchNumber,
        productCount: products.length,
        idempotencyKey,
      });
    }

    return data;
  } catch (error) {
    // Log with full details
    const logDetails = extractLogDetails(error);
    logger.error('Batch upload failed', {
      batch: batchNumber,
      ...logDetails,
    });

    // Return user-friendly error
    const userMessage = sanitizeErrorMessage(error);

    // Add recovery hint for timeout
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new AppError(
        'UPLOAD_TIMEOUT',
        `${userMessage} (Attempt ${batchNumber})`
      );
    }

    throw new AppError('BATCH_UPLOAD_FAILED', userMessage);
  }
}

/**
 * Upload multiple batches sequentially with progress callback
 * Allows cancellation and provides real-time progress
 *
 * @param products - All products to upload
 * @param onProgress - Callback for progress updates
 * @param maxBatchSize - Products per batch (default 100)
 * @returns Combined results from all batches
 */
export async function uploadAllBatches(
  products: CsvProductRow[],
  onProgress?: (progress: {
    currentBatch: number;
    totalBatches: number;
    successCount: number;
    failCount: number;
  }) => void,
  maxBatchSize: number = 100
): Promise<{
  totalSuccessful: number;
  totalFailed: number;
  allResults: ProductUploadResult[];
}> {
  const batches: CsvProductRow[][] = [];
  for (let i = 0; i < products.length; i += maxBatchSize) {
    batches.push(products.slice(i, i + maxBatchSize));
  }

  const allResults: ProductUploadResult[] = [];
  let totalSuccessful = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const response = await uploadProductBatch(batch, i + 1);

      // Collect results
      allResults.push(...response.data.successful);
      allResults.push(...response.data.failed);

      totalSuccessful += response.data.successful.length;
      totalFailed += response.data.failed.length;

      // Call progress callback
      if (onProgress) {
        onProgress({
          currentBatch: i + 1,
          totalBatches: batches.length,
          successCount: totalSuccessful,
          failCount: totalFailed,
        });
      }

      logger.info('Batch uploaded', {
        batch: i + 1,
        of: batches.length,
        successful: response.data.successful.length,
        failed: response.data.failed.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Batch upload error', {
        batch: i + 1,
        error: message,
      });

      // For this batch, mark all as failed
      batch.forEach((product, idx) => {
        const rowNumber = i * maxBatchSize + idx + 1;
        allResults.push({
          rowNumber,
          status: 'failed',
          error: message,
        });
      });

      totalFailed += batch.length;

      // Update progress and continue to next batch
      if (onProgress) {
        onProgress({
          currentBatch: i + 1,
          totalBatches: batches.length,
          successCount: totalSuccessful,
          failCount: totalFailed,
        });
      }

      // Continue uploading other batches
    }
  }

  return {
    totalSuccessful,
    totalFailed,
    allResults,
  };
}
