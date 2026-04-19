/**
 * useStatementGenerator hook for Task 12.9
 * Handles PDF generation, download, and share functionality
 */

import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useStatementStore } from '@/store/statement';
import { getStatementPdf, validateMonthYear } from '@/services/statement';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';
import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface UseStatementGeneratorResult {
  loading: boolean;
  error: string | null;
  pdfUrl: string | null;
  fileName: string | null;
  generatePdf: (month: number, year: number) => Promise<void>;
  downloadPdf: (month: number, year: number) => Promise<void>;
  sharePdf: (month: number, year: number) => Promise<void>;
  reset: () => void;
}

export function useStatementGenerator(): UseStatementGeneratorResult {
  const shopId = useAuthStore((s) => s.shopId);

  const loading = useStatementStore((s) => s.loading);
  const error = useStatementStore((s) => s.error);
  const pdfUrl = useStatementStore((s) => s.pdfUrl);
  const fileName = useStatementStore((s) => s.fileName);

  const setLoading = useStatementStore((s) => s.setLoading);
  const setError = useStatementStore((s) => s.setError);
  const setPdfUrl = useStatementStore((s) => s.setPdfUrl);
  const setFileName = useStatementStore((s) => s.setFileName);
  const setGeneratedMonth = useStatementStore((s) => s.setGeneratedMonth);
  const setGeneratedYear = useStatementStore((s) => s.setGeneratedYear);
  const reset = useStatementStore((s) => s.reset);

  const downloadTaskRef = useRef<string | null>(null);

  const generatePdf = useCallback(
    async (month: number, year: number) => {
      if (!shopId) {
        logger.warn('shopId not available for statement generation');
        setError('Shop ID not found');
        return;
      }

      // Validate month/year
      const validation = validateMonthYear(month, year);
      if (!validation.valid) {
        setError(validation.error || 'Invalid month/year');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const pdfBlob = await getStatementPdf(shopId, month, year);

        // Create a local file path
        const fileUri = `${FileSystem.documentDirectory}statement-${shopId}-${year}-${String(month).padStart(2, '0')}.pdf`;

        // Convert blob to base64
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];

            // Write to file system
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            setPdfUrl(fileUri);
            setFileName(fileUri.split('/').pop() || 'statement.pdf');
            setGeneratedMonth(month);
            setGeneratedYear(year);

            logger.info('Statement PDF generated and saved', {
              shopId,
              month,
              year,
              fileUri,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save PDF';
            setError(message);
            logger.error('PDF save failed', { shopId, error: message });
          } finally {
            setLoading(false);
          }
        };

        reader.onerror = () => {
          setError('Failed to process PDF');
          setLoading(false);
          logger.error('FileReader error');
        };

        reader.readAsDataURL(pdfBlob);
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to generate statement';
        setError(message);
        logger.error('PDF generation failed', { shopId, error: message });
        setLoading(false);
      }
    },
    [shopId, setLoading, setError, setPdfUrl, setFileName, setGeneratedMonth, setGeneratedYear]
  );

  const downloadPdf = useCallback(
    async (month: number, year: number) => {
      if (!shopId) {
        logger.warn('shopId not available for download');
        setError('Shop ID not found');
        return;
      }

      // Validate month/year
      const validation = validateMonthYear(month, year);
      if (!validation.valid) {
        setError(validation.error || 'Invalid month/year');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const pdfBlob = await getStatementPdf(shopId, month, year);
        const fileUri = `${FileSystem.documentDirectory}statement-${shopId}-${year}-${String(month).padStart(2, '0')}.pdf`;

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];

            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            downloadTaskRef.current = fileUri;

            logger.info('Statement PDF downloaded', {
              shopId,
              month,
              year,
              fileUri,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Download failed';
            setError(message);
            logger.error('Download failed', { error: message });
          } finally {
            setLoading(false);
          }
        };

        reader.onerror = () => {
          setError('Failed to process PDF for download');
          setLoading(false);
        };

        reader.readAsDataURL(pdfBlob);
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to download statement';
        setError(message);
        logger.error('Download error', { shopId, error: message });
        setLoading(false);
      }
    },
    [shopId, setLoading, setError]
  );

  const sharePdf = useCallback(
    async (month: number, year: number) => {
      if (!shopId) {
        logger.warn('shopId not available for share');
        setError('Shop ID not found');
        return;
      }

      // Validate month/year
      const validation = validateMonthYear(month, year);
      if (!validation.valid) {
        setError(validation.error || 'Invalid month/year');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const pdfBlob = await getStatementPdf(shopId, month, year);
        const fileUri = `${FileSystem.documentDirectory}statement-${shopId}-${year}-${String(month).padStart(2, '0')}.pdf`;

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];

            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Share via native share dialog
            await Share.share({
              url: fileUri,
              title: 'Share Statement',
              message: `Statement for ${new Date(year, month - 1, 1).toLocaleString('en-IN', {
                month: 'long',
                year: 'numeric',
              })}`,
            });

            logger.info('Statement PDF shared', {
              shopId,
              month,
              year,
            });
          } catch (err) {
            if (err instanceof Error && err.message === 'User did not share') {
              logger.info('Share cancelled by user');
            } else {
              const message = err instanceof Error ? err.message : 'Share failed';
              setError(message);
              logger.error('Share failed', { error: message });
            }
          } finally {
            setLoading(false);
          }
        };

        reader.onerror = () => {
          setError('Failed to process PDF for sharing');
          setLoading(false);
        };

        reader.readAsDataURL(pdfBlob);
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to share statement';
        setError(message);
        logger.error('Share error', { shopId, error: message });
        setLoading(false);
      }
    },
    [shopId, setLoading, setError]
  );

  return {
    loading,
    error,
    pdfUrl,
    fileName,
    generatePdf,
    downloadPdf,
    sharePdf,
    reset,
  };
}
