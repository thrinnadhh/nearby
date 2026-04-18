/**
 * CSV Upload Service — API calls for bulk product uploads
 * Handles batch uploads, progress tracking, and 207 Multi-Status responses
 */

import axios, { AxiosError } from 'axios';
import { client } from '@/services/api';
import { PRODUCTS_ENDPOINTS } from '@/constants/api';
import { useAuthStore } from '@/store/auth';
import {
  CsvProductRow,
  BatchUploadResponse,
  ProductUploadResult,
} from '@/types/csv';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

/**
 * Extract error message from axios error
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { error?: { message?: string } })
      ?.error?.message;
    return message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Upload batch of products via multipart/form-data
 * Backend handles idempotency and deduplication
 * Returns 207 Multi-Status for partial success
 *
 * @param products - Array of validated product rows (max 100)
 * @param batchNumber - Current batch number (for logging)
 * @returns BatchUploadResponse with success/failed product results
 */
export async function uploadProductBatch(
  products: CsvProductRow[],
  batchNumber: number = 1
): Promise<BatchUploadResponse> {
  try {
    if (!products || products.length === 0) {
      throw new AppError(
        'EMPTY_BATCH',
        'Batch cannot be empty'
      );
    }

    if (products.length > 100) {
      throw new AppError(
        'BATCH_TOO_LARGE',
        'Batch size cannot exceed 100 products'
      );
    }

    const shopId = useAuthStore.getState().shopId;
    if (!shopId) {
      throw new AppError(
        'SHOP_ID_MISSING',
        'Shop ID not available'
      );
    }

    // Create FormData with products as JSON array
    // Backend expects: Content-Type: multipart/form-data with 'products' field
    const formData = new FormData();

    // Add products as JSON string
    formData.append('products', JSON.stringify(products));

    // Generate idempotency key for this batch
    const idempotencyKey = `bulk-${Date.now()}-${batchNumber}`;
    formData.append('idempotencyKey', idempotencyKey);

    const url = PRODUCTS_ENDPOINTS.BULK_CREATE.replace(':shopId', shopId);

    logger.info('Starting batch upload', {
      batch: batchNumber,
      productCount: products.length,
      idempotencyKey,
    });

    const { data, status } = await client.post<BatchUploadResponse>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Handle 207 Multi-Status (partial success)
    if (status === 207 || data.statusCode === 207) {
      logger.warn('Batch upload partial success', {
        batch: batchNumber,
        successful: data.data.successful.length,
        failed: data.data.failed.length,
      });
    } else {
      logger.info('Batch upload successful', {
        batch: batchNumber,
        productCount: products.length,
      });
    }

    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Batch upload failed', {
      batch: batchNumber,
      error: message,
    });

    // Parse axios error for more details
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 413) {
        throw new AppError(
          'PAYLOAD_TOO_LARGE',
          'Batch payload too large. Try fewer products per batch.'
        );
      }
      if (error.response?.status === 422) {
        throw new AppError(
          'VALIDATION_FAILED',
          'Batch contains invalid products'
        );
      }
    }

    throw new AppError('BATCH_UPLOAD_FAILED', message);
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
  const batches = [];
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
