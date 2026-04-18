/**
 * BulkUploadScreen — main container for bulk CSV upload flow
 * Orchestrates file picker → preview → upload → results flow
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useCsvParser } from '@/hooks/useCsvParser';
import { useBulkUpload } from '@/hooks/useBulkUpload';
import { CsvRowWithErrors } from '@/types/csv';
import { FilePickerStep } from '@/components/bulk-upload/FilePickerStep';
import { PreviewStep } from '@/components/bulk-upload/PreviewStep';
import { UploadStep } from '@/components/bulk-upload/UploadStep';
import { ResultsStep } from '@/components/bulk-upload/ResultsStep';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import logger from '@/utils/logger';

type UploadStep = 'file-picker' | 'preview' | 'upload' | 'results';

export default function BulkUploadScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<UploadStep>('file-picker');

  // CSV parsing hook
  const {
    file,
    previewData,
    isLoading: isParsingLoading,
    error: parseError,
    pickFile,
    clearPreview,
  } = useCsvParser();

  // Bulk upload hook
  const {
    isUploading,
    progress,
    results,
    error: uploadError,
    uploadRows,
    clearResults,
    retryUpload,
  } = useBulkUpload();

  /**
   * Handle file selection and parsing
   */
  const handlePickFile = useCallback(async () => {
    try {
      await pickFile();
      setCurrentStep('preview');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to pick file';
      logger.error('File picker error', { error: errorMsg });
    }
  }, [pickFile]);

  /**
   * Handle preview confirmation - start upload
   */
  const handleConfirmPreview = useCallback(
    async (rows: CsvRowWithErrors[]) => {
      try {
        setCurrentStep('upload');
        logger.info('Starting upload', { validRows: rows.filter((r) => r.isValid).length });
        await uploadRows(rows);
        setCurrentStep('results');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';
        logger.error('Upload error in screen', { error: errorMsg });
        Alert.alert('Upload Error', errorMsg);
        setCurrentStep('preview');
      }
    },
    [uploadRows]
  );

  /**
   * Handle preview cancellation
   */
  const handleCancelPreview = useCallback(() => {
    logger.info('Preview cancelled');
    clearPreview();
    setCurrentStep('file-picker');
  }, [clearPreview]);

  /**
   * Handle upload cancellation
   */
  const handleCancelUpload = useCallback(() => {
    logger.warn('Upload cancelled by user');
    setCurrentStep('preview');
  }, []);

  /**
   * Handle results screen completion
   */
  const handleResultsDone = useCallback(() => {
    logger.info('Results screen closed');
    clearResults();
    setCurrentStep('file-picker');
  }, [clearResults]);

  /**
   * Handle retry of failed products
   */
  const handleRetryFailed = useCallback(
    async (failedCount: number) => {
      if (!results) return;

      try {
        const failedRows = previewData?.rows.filter(
          (row) =>
            results.results.find(
              (r) => r.rowNumber === row.rowNumber && r.status === 'failed'
            )
        ) || [];

        if (failedRows.length === 0) {
          logger.warn('No failed rows found for retry');
          return;
        }

        setCurrentStep('upload');
        logger.info('Retrying failed products', { count: failedCount });
        await retryUpload(failedRows);
        setCurrentStep('results');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Retry failed';
        logger.error('Retry error', { error: errorMsg });
        Alert.alert('Retry Error', errorMsg);
      }
    },
    [results, previewData, retryUpload]
  );

  /**
   * Back button handler - navigate back or through steps
   */
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = router.canGoBack() ? null : undefined;
      return () => unsubscribe?.();
    }, [router])
  );

  logger.info('BulkUploadScreen rendered', {
    currentStep,
    hasFile: !!file,
    hasPreview: !!previewData,
  });

  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Step 1: File Picker */}
          {currentStep === 'file-picker' && (
            <FilePickerStep
              onFilePicked={handlePickFile}
              isLoading={isParsingLoading}
              error={parseError}
            />
          )}

          {/* Step 2: Preview */}
          {currentStep === 'preview' && previewData && (
            <PreviewStep
              previewData={previewData}
              onConfirm={handleConfirmPreview}
              onCancel={handleCancelPreview}
              isLoading={isUploading}
            />
          )}

          {/* Step 3: Upload Progress */}
          {currentStep === 'upload' && previewData && (
            <UploadStep
              progress={progress}
              totalRows={previewData.totalRows}
              onCancel={handleCancelUpload}
            />
          )}

          {/* Step 4: Results */}
          {currentStep === 'results' && results && (
            <ResultsStep
              results={results}
              onDone={handleResultsDone}
              onRetryFailed={handleRetryFailed}
            />
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
