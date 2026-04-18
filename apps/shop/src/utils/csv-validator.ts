/**
 * CSV Validator — validates parsed rows against Joi schema
 * Row-by-row validation with field-level error messages
 */

import { CsvRawRow, CsvRowWithErrors } from '@/types/csv';
import { csvRowSchema, CSV_HEADERS, CSV_CONSTRAINTS } from '@/constants/csv-schema';
import { convertPriceToPaise, convertStockQty } from '@/utils/csv-parser';
import logger from '@/utils/logger';

/**
 * Validate a single CSV row
 * Converts string values to proper types and validates against Joi schema
 *
 * @param rawRow - Raw row from CSV (all string values)
 * @param rowNumber - Row number (1-indexed for display)
 * @returns Validated row with isValid flag and errors
 */
export function validateCsvRow(
  rawRow: CsvRawRow,
  rowNumber: number
): CsvRowWithErrors {
  const errors: Record<string, string> = {};
  let isValid = true;

  let processedRow: Record<string, any> = { ...rawRow };

  // Convert price to number (paise)
  if (processedRow[CSV_HEADERS.PRICE]) {
    try {
      processedRow[CSV_HEADERS.PRICE] = convertPriceToPaise(
        processedRow[CSV_HEADERS.PRICE]
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid price';
      errors[CSV_HEADERS.PRICE] = errorMsg;
      isValid = false;
    }
  }

  // Convert stock quantity to number
  if (processedRow[CSV_HEADERS.STOCK_QTY]) {
    try {
      processedRow[CSV_HEADERS.STOCK_QTY] = convertStockQty(
        processedRow[CSV_HEADERS.STOCK_QTY]
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid quantity';
      errors[CSV_HEADERS.STOCK_QTY] = errorMsg;
      isValid = false;
    }
  }

  // Validate against Joi schema
  const { error, value } = csvRowSchema.validate(processedRow, {
    abortEarly: false,
    convert: false,
    stripUnknown: true,
  });

  if (error) {
    error.details.forEach((detail) => {
      const field = detail.path[0] as string;
      if (field && !errors[field]) {
        errors[field] = detail.message;
        isValid = false;
      }
    });
  }

  // Check for extra columns not in schema
  const schemaKeys = Object.keys(csvRowSchema.describe().keys || {});
  Object.keys(processedRow).forEach((key) => {
    if (!schemaKeys.includes(key) && key.trim()) {
      // Extra columns are allowed, just ignored
      logger.debug('Extra column in CSV row', { row: rowNumber, column: key });
    }
  });

  const validatedRow = isValid ? (value as any) : processedRow;

  return {
    name: validatedRow[CSV_HEADERS.NAME] || '',
    description: validatedRow[CSV_HEADERS.DESCRIPTION] || undefined,
    category: validatedRow[CSV_HEADERS.CATEGORY] || '',
    price: validatedRow[CSV_HEADERS.PRICE] || 0,
    stockQty: validatedRow[CSV_HEADERS.STOCK_QTY] || 0,
    unit: validatedRow[CSV_HEADERS.UNIT] || '',
    rowNumber,
    errors,
    isValid,
  };
}

/**
 * Validate all CSV rows
 * Returns array of validated rows with errors marked
 *
 * @param rows - Raw rows from CSV
 * @returns Array of validated rows
 * @throws Error if row count exceeds limit
 */
export function validateAllCsvRows(rows: CsvRawRow[]): CsvRowWithErrors[] {
  // Check row count
  if (rows.length > CSV_CONSTRAINTS.MAX_ROWS) {
    logger.error('Too many CSV rows', {
      count: rows.length,
      max: CSV_CONSTRAINTS.MAX_ROWS,
    });
    throw new Error(
      `CSV contains too many rows (${rows.length}). Maximum is ${CSV_CONSTRAINTS.MAX_ROWS}.`
    );
  }

  if (rows.length < CSV_CONSTRAINTS.MIN_ROWS) {
    logger.error('Too few CSV rows', {
      count: rows.length,
      min: CSV_CONSTRAINTS.MIN_ROWS,
    });
    throw new Error('CSV must contain at least one data row');
  }

  // Validate each row
  const validatedRows = rows.map((row, index) =>
    validateCsvRow(row, index + 1) // 1-indexed for display
  );

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.filter((r) => !r.isValid).length;

  logger.info('CSV rows validated', {
    total: validatedRows.length,
    valid: validCount,
    invalid: invalidCount,
  });

  return validatedRows;
}

/**
 * Get summary statistics for validated rows
 *
 * @param rows - Validated rows
 * @returns Summary object
 */
export function getValidationSummary(
  rows: CsvRowWithErrors[]
): {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  validPercentage: number;
} {
  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.length - validCount;
  const percentage = rows.length > 0 ? (validCount / rows.length) * 100 : 0;

  return {
    totalRows: rows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    validPercentage: Math.round(percentage),
  };
}

/**
 * Check if any row has required field errors
 * (vs. just format errors)
 *
 * @param rows - Validated rows
 * @returns true if all rows have valid structure
 */
export function hasStructuralErrors(rows: CsvRowWithErrors[]): boolean {
  return rows.some((row) => {
    // Required fields with missing values
    if (!row.name || !row.category || !row.price || !row.unit) {
      return true;
    }
    return false;
  });
}
