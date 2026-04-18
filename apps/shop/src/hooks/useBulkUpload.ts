/**
 * useBulkUpload Hook — manages bulk upload state and operations
 * Handles batch uploads, progress tracking, and result aggregation
 */

import { useState, useCallback, useRef } from 'react';
import {
  CsvRowWithErrors,
  CsvProductRow,
  UploadProgress,
  UploadResults,
  ProductUploadResult,
} from '@/types/csv';
import {
  uploadAllBatches,
} from '@/services/csv-upload';
import { useProductsStore } from '@/store/products';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseBulkUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  results: UploadResults | null;
  error: string | null;
}

interface UseBulkUploadActions {
  uploadRows: (rows: CsvRowWithErrors[]) => Promise<UploadResults>;
  clearResults: () => void;
  retryUpload: (failedRows: CsvRowWithErrors[]) => Promise<UploadResults>;
  cancel: () => void;
}

/**
 * useBulkUpload Hook
 * Manage CSV product batch uploads with progress tracking
 */
export function useBulkUpload(): UseBulkUploadState & UseBulkUploadActions {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [results, setResults] = useState<UploadResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef(false);
  const { setProducts } = useProductsStore();

  /**
   * Convert validated CSV rows to product rows (filter valid ones)
   */
  const getValidProducts = useCallback(
    (rows: CsvRowWithErrors[]): CsvProductRow[] => {
      return rows
        .filter((row) => row.isValid)
        .map((row) => ({
          name: row.name,
          description: row.description,
          category: row.category,
          price: row.price,
          stockQty: row.stockQty,
          unit: row.unit,
        }));
    },
    []
  );

  /**
   * Upload all validated rows in batches
   * Handles progress updates and cancellation
   */
  const uploadRows = useCallback(
    async (rows: CsvRowWithErrors[]): Promise<UploadResults> => {
      try {
        // Validate input
        if (!rows || rows.length === 0) {
          throw new AppError('NO_ROWS', 'No rows to upload');
        }

        const validRows = rows.filter((r) => r.isValid);
        if (validRows.length === 0) {
          throw new AppError(
            'NO_VALID_ROWS',
            'No valid products to upload'
          );
        }

        setIsUploading(true);
        setError(null);
        setResults(null);
        cancelRef.current = false;

        const startTime = Date.now();

        // Get products to upload
        const productsToUpload = getValidProducts(rows);

        logger.info('Starting bulk upload', {
          totalRows: rows.length,
          validRows: productsToUpload.length,
          invalidRows: rows.length - productsToUpload.length,
        });

        // Upload in batches
        const uploadResults = await uploadAllBatches(
          productsToUpload,
          (progress) => {
            if (cancelRef.current) {
              logger.warn('Upload cancelled by user');
              throw new Error('Upload cancelled');
            }

            const totalProducts = productsToUpload.length;
            const successCount = progress.successCount;
            const failCount = progress.failCount;
            const processedCount = successCount + failCount;
            const percentage = Math.round(
              (processedCount / totalProducts) * 100
            );

            const progressUpdate: UploadProgress = {
              currentBatch: progress.currentBatch,
              totalBatches: progress.totalBatches,
              currentRow: processedCount,
              totalRows: totalProducts,
              percentage,
              status: 'uploading',
            };

            setProgress(progressUpdate);
            logger.debug('Upload progress', progressUpdate);
          },
          100 // Max 100 products per batch
        );

        const endTime = Date.now();

        // Compile final results
        const finalResults: UploadResults = {
          totalProcessed: uploadResults.allResults.length,
          successfulCount: uploadResults.totalSuccessful,
          failedCount: uploadResults.totalFailed,
          results: uploadResults.allResults,
          startTime,
          endTime,
          duration: endTime - startTime,
        };

        logger.info('Bulk upload complete', {
          successful: finalResults.successfulCount,
          failed: finalResults.failedCount,
          duration: finalResults.duration,
        });

        setResults(finalResults);
        setProgress({
          currentBatch: finalResults.totalProcessed,
          totalBatches: finalResults.totalProcessed,
          currentRow: finalResults.totalProcessed,
          totalRows: finalResults.totalProcessed,
          percentage: 100,
          status: 'completed',
        });

        // Trigger store refresh after successful upload
        // Note: actual product list refresh happens via Socket.IO or manual refetch
        if (finalResults.successfulCount > 0) {
          logger.info('Products uploaded, store refresh needed');
        }

        return finalResults;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';

        logger.error('Bulk upload error', { error: errorMsg });
        setError(errorMsg);

        throw new AppError('UPLOAD_FAILED', errorMsg);
      } finally {
        setIsUploading(false);
      }
    },
    [getValidProducts]
  );

  /**
   * Retry uploading failed rows
   * Useful for handling transient errors
   */
  const retryUpload = useCallback(
    async (failedRows: CsvRowWithErrors[]): Promise<UploadResults> => {
      if (!failedRows || failedRows.length === 0) {
        throw new AppError('NO_FAILED_ROWS', 'No failed rows to retry');
      }

      logger.info('Retrying failed rows', { count: failedRows.length });
      return uploadRows(failedRows);
    },
    [uploadRows]
  );

  /**
   * Cancel ongoing upload
   */
  const cancel = useCallback(() => {
    cancelRef.current = true;
    logger.info('Upload cancellation requested');
  }, []);

  /**
   * Clear results and reset state
   */
  const clearResults = useCallback(() => {
    setResults(null);
    setProgress(null);
    setError(null);
    cancelRef.current = false;
    logger.info('Upload results cleared');
  }, []);

  return {
    isUploading,
    progress,
    results,
    error,
    uploadRows,
    clearResults,
    retryUpload,
    cancel,
  };
}
