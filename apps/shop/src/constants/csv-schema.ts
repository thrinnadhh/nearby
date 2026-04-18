/**
 * CSV Schema — Column headers, validation rules, and constraints
 * Matches backend createProductSchema exactly
 */

import Joi from 'joi';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  CATEGORY_LABELS,
  UNIT_LABELS,
} from '@/utils/productValidation';

/**
 * Expected CSV column headers (case-insensitive, order-independent)
 * All headers must be present for valid CSV
 */
export const CSV_HEADERS = {
  NAME: 'Product Name',
  DESCRIPTION: 'Description',
  CATEGORY: 'Category',
  PRICE: 'Price (₹)',
  STOCK_QTY: 'Stock Quantity',
  UNIT: 'Unit',
} as const;

/**
 * Header aliases for flexible parsing (user might use different names)
 * Maps alternative column names to canonical names
 */
export const HEADER_ALIASES: Record<string, string> = {
  // Name variants
  'product name': CSV_HEADERS.NAME,
  'product': CSV_HEADERS.NAME,
  'name': CSV_HEADERS.NAME,
  'item name': CSV_HEADERS.NAME,
  'item': CSV_HEADERS.NAME,

  // Description variants
  'description': CSV_HEADERS.DESCRIPTION,
  'desc': CSV_HEADERS.DESCRIPTION,
  'details': CSV_HEADERS.DESCRIPTION,
  'product description': CSV_HEADERS.DESCRIPTION,

  // Category variants
  'category': CSV_HEADERS.CATEGORY,
  'product category': CSV_HEADERS.CATEGORY,
  'type': CSV_HEADERS.CATEGORY,

  // Price variants (all should be in paise)
  'price (₹)': CSV_HEADERS.PRICE,
  'price': CSV_HEADERS.PRICE,
  'price (rs)': CSV_HEADERS.PRICE,
  'mrp': CSV_HEADERS.PRICE,
  'cost': CSV_HEADERS.PRICE,
  'selling price': CSV_HEADERS.PRICE,

  // Stock variants
  'stock quantity': CSV_HEADERS.STOCK_QTY,
  'stock qty': CSV_HEADERS.STOCK_QTY,
  'stock': CSV_HEADERS.STOCK_QTY,
  'quantity': CSV_HEADERS.STOCK_QTY,
  'qty': CSV_HEADERS.STOCK_QTY,
  'available stock': CSV_HEADERS.STOCK_QTY,

  // Unit variants
  'unit': CSV_HEADERS.UNIT,
  'measurement': CSV_HEADERS.UNIT,
  'size': CSV_HEADERS.UNIT,
};

/**
 * Joi schema for CSV row validation
 * Applied row-by-row during preview
 * Matches backend createProductSchema
 */
export const csvRowSchema = Joi.object({
  [CSV_HEADERS.NAME]: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Product name is required',
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters',
    }),

  [CSV_HEADERS.DESCRIPTION]: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),

  [CSV_HEADERS.CATEGORY]: Joi.string()
    .trim()
    .valid(...PRODUCT_CATEGORIES)
    .required()
    .messages({
      'string.empty': 'Category is required',
      'any.only': `Category must be one of: ${Array.from(PRODUCT_CATEGORIES).join(', ')}`,
    }),

  [CSV_HEADERS.PRICE]: Joi.number()
    .integer()
    .min(100) // ₹1.00 minimum in paise
    .max(9999999900) // ₹99,999,999
    .required()
    .messages({
      'number.base': 'Price must be a valid number',
      'number.integer': 'Price must be a whole number (paise)',
      'number.min': 'Price must be at least ₹1.00 (100 paise)',
      'number.max': 'Price cannot exceed ₹99,999,999',
    }),

  [CSV_HEADERS.STOCK_QTY]: Joi.number()
    .integer()
    .min(0)
    .max(99999)
    .required()
    .messages({
      'number.base': 'Stock quantity must be a number',
      'number.integer': 'Stock quantity must be a whole number',
      'number.min': 'Stock quantity must be 0 or greater',
      'number.max': 'Stock quantity cannot exceed 99,999',
    }),

  [CSV_HEADERS.UNIT]: Joi.string()
    .trim()
    .valid(...PRODUCT_UNITS)
    .required()
    .messages({
      'string.empty': 'Unit is required',
      'any.only': `Unit must be one of: ${Array.from(PRODUCT_UNITS).join(', ')}`,
    }),
});

/**
 * CSV file constraints
 */
export const CSV_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_ROWS_PER_REQUEST: 100, // Batch size
  MIN_ROWS: 1,
  MAX_ROWS: 10000,
  ACCEPTED_MIME_TYPES: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  ACCEPTED_EXTENSIONS: ['.csv'],
} as const;

/**
 * Step titles for UI
 */
export const UPLOAD_STEPS = {
  FILE_PICKER: 'Select File',
  PREVIEW: 'Review Data',
  UPLOAD: 'Uploading',
  RESULTS: 'Results',
} as const;

/**
 * Sample CSV header row for download template
 */
export const SAMPLE_CSV_HEADERS = [
  CSV_HEADERS.NAME,
  CSV_HEADERS.DESCRIPTION,
  CSV_HEADERS.CATEGORY,
  CSV_HEADERS.PRICE,
  CSV_HEADERS.STOCK_QTY,
  CSV_HEADERS.UNIT,
];

/**
 * Sample CSV data row for download template
 */
export const SAMPLE_CSV_DATA = {
  [CSV_HEADERS.NAME]: 'Basmati Rice',
  [CSV_HEADERS.DESCRIPTION]: 'Premium long-grain basmati rice',
  [CSV_HEADERS.CATEGORY]: 'grocery',
  [CSV_HEADERS.PRICE]: 25000, // ₹250
  [CSV_HEADERS.STOCK_QTY]: 50,
  [CSV_HEADERS.UNIT]: 'kg',
};
