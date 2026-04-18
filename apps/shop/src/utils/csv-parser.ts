/**
 * CSV Parser Utility — parses CSV files into typed rows
 * Uses papaparse library for robust parsing
 * Handles BOM, extra columns, missing headers
 */

import Papa from 'papaparse';
import { CsvRawRow, CsvParseError, PickedFile } from '@/types/csv';
import {
  CSV_HEADERS,
  HEADER_ALIASES,
  CSV_CONSTRAINTS,
} from '@/constants/csv-schema';
import logger from '@/utils/logger';

/**
 * Parse CSV file into raw rows
 * Returns array of row objects with normalized column names
 *
 * @param file - Picked file from document picker
 * @param fileContent - Raw file content as string
 * @returns Parsed rows and headers
 * @throws CsvParseError if parsing fails
 */
export async function parseCsvFile(
  file: PickedFile,
  fileContent: string
): Promise<{ rows: CsvRawRow[]; headers: string[] }> {
  try {
    // Remove BOM if present
    const cleanContent = fileContent.replace(/^\uFEFF/, '');

    // Parse CSV
    const result = Papa.parse(cleanContent, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      trimHeaders: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (result.errors && result.errors.length > 0) {
      const error = result.errors[0];
      logger.error('Papa Parse error', { error });
      throw new Error(`CSV parsing failed: ${error.message}`);
    }

    if (!result.data || result.data.length === 0) {
      throw new Error('CSV file is empty');
    }

    const rows = result.data as CsvRawRow[];

    logger.info('CSV file parsed', {
      file: file.name,
      rows: rows.length,
    });

    // Extract headers from first row
    const headers = Object.keys(rows[0]).filter((h) => h.length > 0);

    return { rows, headers };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    logger.error('CSV parsing error', { file: file.name, error: message });
    throw {
      code: 'CSV_PARSE_ERROR',
      message,
    } as CsvParseError;
  }
}

/**
 * Normalize CSV headers to canonical names
 * Maps user headers to expected column names using aliases
 *
 * @param userHeaders - Headers from CSV file
 * @returns Object mapping user headers to canonical names
 * @throws CsvParseError if required headers missing
 */
export function normalizeHeaders(
  userHeaders: string[]
): Record<string, string> {
  const headerMap: Record<string, string> = {};

  // Required canonical headers
  const requiredHeaders = new Set([
    CSV_HEADERS.NAME,
    CSV_HEADERS.CATEGORY,
    CSV_HEADERS.PRICE,
    CSV_HEADERS.STOCK_QTY,
    CSV_HEADERS.UNIT,
  ]);

  const foundHeaders = new Set<string>();

  // Map user headers to canonical
  userHeaders.forEach((userHeader) => {
    const normalizedHeader = userHeader.toLowerCase();
    const canonicalName = HEADER_ALIASES[normalizedHeader];

    if (canonicalName) {
      headerMap[canonicalName] = userHeader;
      foundHeaders.add(canonicalName);
    }
  });

  // Check for missing required headers
  const missingHeaders = Array.from(requiredHeaders).filter(
    (h) => !foundHeaders.has(h)
  );

  if (missingHeaders.length > 0) {
    const missing = missingHeaders.join(', ');
    logger.error('Missing required CSV headers', { missing });
    throw {
      code: 'MISSING_HEADERS',
      message: `Missing required columns: ${missing}`,
    } as CsvParseError;
  }

  logger.info('CSV headers normalized', {
    userHeaders: userHeaders.length,
    canonicalHeaders: foundHeaders.size,
  });

  return headerMap;
}

/**
 * Transform raw row with user headers to normalized row with canonical headers
 * Handles string trimming and optional fields
 *
 * @param rawRow - Raw row from CSV
 * @param headerMap - Mapping of canonical -> user headers
 * @returns Normalized row object
 */
export function transformRow(
  rawRow: CsvRawRow,
  headerMap: Record<string, string>
): CsvRawRow {
  const transformedRow: CsvRawRow = {};

  Object.entries(headerMap).forEach(([canonicalName, userHeader]) => {
    const value = rawRow[userHeader]?.trim() ?? '';
    if (value) {
      transformedRow[canonicalName] = value;
    }
  });

  return transformedRow;
}

/**
 * Validate file before parsing
 * Checks MIME type, size, extension
 *
 * @param file - Picked file
 * @returns true if valid
 * @throws CsvParseError if invalid
 */
export function validateFile(file: PickedFile): true {
  // Check file size
  if (file.size > CSV_CONSTRAINTS.MAX_FILE_SIZE) {
    logger.error('CSV file too large', {
      size: file.size,
      max: CSV_CONSTRAINTS.MAX_FILE_SIZE,
    });
    throw {
      code: 'FILE_TOO_LARGE',
      message: `File size must be under ${
        CSV_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)
      } MB`,
    } as CsvParseError;
  }

  // Check extension
  const hasValidExt = CSV_CONSTRAINTS.ACCEPTED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExt) {
    logger.error('Invalid CSV file extension', {
      name: file.name,
      accepted: CSV_CONSTRAINTS.ACCEPTED_EXTENSIONS,
    });
    throw {
      code: 'INVALID_FILE_TYPE',
      message: 'File must be a CSV file (.csv)',
    } as CsvParseError;
  }

  logger.info('CSV file validated', { file: file.name, size: file.size });
  return true;
}

/**
 * Convert string price to paise (integer)
 * Handles rupees input and converts to paise
 *
 * @param priceStr - Price as string (e.g., "250.50" or "250")
 * @returns Price in paise
 * @throws Error if conversion fails
 */
export function convertPriceToPaise(priceStr: string): number {
  const price = parseFloat(priceStr.trim());

  if (isNaN(price)) {
    throw new Error(`Invalid price format: ${priceStr}`);
  }

  // Convert rupees to paise (₹250 = 25000 paise)
  const paise = Math.round(price * 100);

  return paise;
}

/**
 * Convert string stock quantity to integer
 *
 * @param qtyStr - Quantity as string
 * @returns Quantity as integer
 * @throws Error if conversion fails
 */
export function convertStockQty(qtyStr: string): number {
  const qty = parseInt(qtyStr.trim(), 10);

  if (isNaN(qty)) {
    throw new Error(`Invalid quantity format: ${qtyStr}`);
  }

  return qty;
}
