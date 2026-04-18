/**
 * useCsvParser Hook — manages CSV file parsing and validation workflow
 * Handles file selection, parsing, normalization, and validation
 */

import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  CsvRawRow,
  CsvRowWithErrors,
  CsvPreviewData,
  CsvParseError,
  PickedFile,
} from '@/types/csv';
import {
  parseCsvFile,
  normalizeHeaders,
  transformRow,
  validateFile,
} from '@/utils/csv-parser';
import { validateAllCsvRows } from '@/utils/csv-validator';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseCsvParserState {
  previewData: CsvPreviewData | null;
  isLoading: boolean;
  error: string | null;
  file: PickedFile | null;
}

interface UseCsvParserActions {
  pickFile: () => Promise<void>;
  parseFile: (file: PickedFile) => Promise<CsvPreviewData>;
  clearPreview: () => void;
  retryParse: () => Promise<void>;
}

/**
 * useCsvParser Hook
 * Manage CSV file picking, parsing, and validation
 */
export function useCsvParser(): UseCsvParserState & UseCsvParserActions {
  const [previewData, setPreviewData] = useState<CsvPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);

  /**
   * Open document picker to select CSV file
   */
  const pickFile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        logger.info('File picker cancelled');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        throw new Error('No file selected');
      }

      const asset = result.assets[0];
      const pickedFile: PickedFile = {
        uri: asset.uri,
        name: asset.name,
        size: asset.size || 0,
        type: asset.mimeType || 'text/csv',
        mimeType: asset.mimeType,
      };

      logger.info('File picked', {
        name: pickedFile.name,
        size: pickedFile.size,
      });

      // Validate file
      validateFile(pickedFile);

      // Parse immediately
      setFile(pickedFile);
      await parseFile(pickedFile);
    } catch (err) {
      const errorMsg = err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Failed to pick file';

      logger.error('File pick error', { error: errorMsg });
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Parse selected CSV file
   * Reads file content, parses headers, validates rows
   */
  const parseFile = useCallback(async (pickedFile: PickedFile): Promise<CsvPreviewData> => {
    try {
      setIsLoading(true);
      setError(null);

      logger.info('Starting CSV file parse', { file: pickedFile.name });

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(pickedFile.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Parse CSV
      const { rows: rawRows, headers: userHeaders } = await parseCsvFile(
        pickedFile,
        fileContent
      );

      // Normalize headers
      const headerMap = normalizeHeaders(userHeaders);

      // Transform all rows to use canonical headers
      const transformedRows = rawRows.map((row) =>
        transformRow(row, headerMap)
      );

      // Validate all rows
      const validatedRows = validateAllCsvRows(transformedRows);

      // Calculate statistics
      const validCount = validatedRows.filter((r) => r.isValid).length;
      const invalidCount = validatedRows.length - validCount;

      const preview: CsvPreviewData = {
        rows: validatedRows,
        totalRows: validatedRows.length,
        validRows: validCount,
        invalidRows: invalidCount,
        fileSize: pickedFile.size,
        fileName: pickedFile.name,
      };

      logger.info('CSV parsing complete', {
        file: pickedFile.name,
        total: preview.totalRows,
        valid: preview.validRows,
        invalid: preview.invalidRows,
      });

      setPreviewData(preview);
      return preview;
    } catch (err) {
      let errorMsg: string;

      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        const parseError = err as CsvParseError;
        errorMsg = parseError.message;
      } else {
        errorMsg = err instanceof Error ? err.message : 'Failed to parse file';
      }

      logger.error('CSV parse error', {
        file: pickedFile.name,
        error: errorMsg,
      });

      setError(errorMsg);
      throw new AppError('CSV_PARSE_FAILED', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear preview and start over
   */
  const clearPreview = useCallback(() => {
    setPreviewData(null);
    setError(null);
    setFile(null);
    logger.info('CSV preview cleared');
  }, []);

  /**
   * Retry parsing current file
   */
  const retryParse = useCallback(async () => {
    if (!file) {
      setError('No file selected');
      return;
    }

    try {
      await parseFile(file);
    } catch (err) {
      logger.error('Retry parse failed', {
        file: file.name,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [file, parseFile]);

  return {
    previewData,
    isLoading,
    error,
    file,
    pickFile,
    parseFile,
    clearPreview,
    retryParse,
  };
}
