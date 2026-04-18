/**
 * CSV Upload Types
 * Defines all types for bulk product upload flow
 */

/**
 * Raw CSV row as parsed by papaparse
 * All values are strings
 */
export interface CsvRawRow {
  [key: string]: string;
}

/**
 * Validated CSV row with typed fields
 */
export interface CsvProductRow {
  name: string;
  description?: string;
  category: string;
  price: number; // in paise
  stockQty: number;
  unit: string;
}

/**
 * CSV row with validation errors
 */
export interface CsvRowWithErrors extends CsvProductRow {
  rowNumber: number;
  errors: Record<string, string>; // field -> error message
  isValid: boolean;
}

/**
 * Preview data shown to user
 */
export interface CsvPreviewData {
  rows: CsvRowWithErrors[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  fileSize: number;
  fileName: string;
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  currentBatch: number;
  totalBatches: number;
  currentRow: number;
  totalRows: number;
  percentage: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

/**
 * Single product result from batch upload
 */
export interface ProductUploadResult {
  rowNumber: number;
  status: 'success' | 'failed';
  productId?: string;
  error?: string;
}

/**
 * Batch upload response (207 Multi-Status)
 * Server returns partial success scenarios
 */
export interface BatchUploadResponse {
  success: boolean;
  statusCode: number; // 200, 201, or 207
  data: {
    batchId: string;
    totalProcessed: number;
    successful: ProductUploadResult[];
    failed: ProductUploadResult[];
  };
}

/**
 * Final results screen data
 */
export interface UploadResults {
  totalProcessed: number;
  successfulCount: number;
  failedCount: number;
  results: ProductUploadResult[];
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
}

/**
 * CSV parser error details
 */
export interface CsvParseError {
  code: string;
  message: string;
  row?: number;
  field?: string;
}

/**
 * File picked from device
 */
export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  type: string;
  mimeType?: string;
}
