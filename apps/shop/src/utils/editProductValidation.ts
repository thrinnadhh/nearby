/**
 * Edit Product validation schema and utilities
 * Matches backend updateProductSchema for client-side validation
 * Handles price/stock conversions and validates partial updates
 */

import Joi from 'joi';

/**
 * Edit product form data structure
 * All fields optional since it's a partial update
 */
export interface EditProductFormData {
  price?: number; // in paise (integer)
  stockQty?: number; // quantity
  isAvailable?: boolean; // availability toggle
}

/**
 * Edit product form errors
 * Maps field names to error messages
 * Includes form-level errors as well
 */
export interface EditProductFormErrors {
  price?: string;
  stockQty?: string;
  isAvailable?: string;
  form?: string; // Form-level errors (e.g., "Please change at least one field")
}

/**
 * Individual field validators (without .optional())
 * Used for field-level validation
 */
const priceValidator = Joi.number()
  .integer()
  .min(1)
  .max(999999900)
  .messages({
    'number.base': 'Price must be a number',
    'number.integer': 'Price must be a whole number',
    'number.min': 'Price must be at least ₹0.01',
    'number.max': 'Price must not exceed ₹9,999,999',
  });

const stockQtyValidator = Joi.number()
  .integer()
  .min(0)
  .messages({
    'number.base': 'Stock must be a number',
    'number.integer': 'Stock must be a whole number',
    'number.min': 'Stock must be 0 or greater',
  });

const isAvailableValidator = Joi.boolean()
  .messages({
    'boolean.base': 'Availability must be true or false',
  });

/**
 * Validation schema for edit product form
 * Matches backend updateProductSchema
 * All fields are optional, but at least one must be provided
 */
const editProductSchema = Joi.object({
  price: priceValidator.optional(),
  stockQty: stockQtyValidator.optional(),
  isAvailable: isAvailableValidator.optional(),
})
  .min(1)
  .messages({
    'object.min': 'Please change at least one field',
  });

/**
 * Validate entire edit form
 * Returns error object if invalid, empty object if valid
 */
export function validateEditProductForm(formData: EditProductFormData): EditProductFormErrors {
  const { error, value } = editProductSchema.validate(formData, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (!error) {
    return {};
  }

  const errors: EditProductFormErrors = {};
  error.details.forEach((detail) => {
    const field = detail.path[0] as keyof EditProductFormErrors | undefined;
    
    // Handle form-level errors (e.g., 'object.min')
    if (!field || detail.type === 'object.min') {
      errors.form = detail.message;
    } else {
      // Handle field-level errors
      errors[field] = detail.message;
    }
  });

  return errors;
}

/**
 * Validate single field
 * Returns error message if invalid, undefined if valid
 */
export function validateEditProductField(
  field: keyof EditProductFormData,
  value: unknown
): string | undefined {
  let fieldValidator: Joi.Schema;

  switch (field) {
    case 'price':
      fieldValidator = priceValidator;
      break;
    case 'stockQty':
      fieldValidator = stockQtyValidator;
      break;
    case 'isAvailable':
      fieldValidator = isAvailableValidator;
      break;
    default:
      return undefined;
  }

  const { error } = fieldValidator.validate(value);
  return error?.message;
}

/**
 * Convert rupees (decimal string) to paise (integer)
 * "₹123.45" or "123.45" → 12345
 */
export function rupeesToPaise(rupees: string | number): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert paise (integer) to rupees (decimal number)
 * 12345 → 123.45
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format rupees string for display (without currency symbol)
 * 123.45 → "123.45"
 */
export function formatRupeesForDisplay(rupees: number): string {
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse price input (handles various formats)
 * "₹123" or "123" or "123.45" → 12345 (paise)
 */
export function parsePriceInput(input: string): number {
  // Remove currency symbol and whitespace
  const cleaned = input.replace(/[₹\s]/g, '');
  const rupees = parseFloat(cleaned);
  return rupeesToPaise(rupees);
}

/**
 * Check if two products have meaningful differences
 * Used to determine if submit button should be enabled
 */
export function hasProductChanges(
  original: {
    price: number;
    stockQty: number;
    isAvailable: boolean;
  },
  edited: EditProductFormData
): boolean {
  if (
    edited.price !== undefined &&
    edited.price !== original.price
  ) {
    return true;
  }

  if (
    edited.stockQty !== undefined &&
    edited.stockQty !== original.stockQty
  ) {
    return true;
  }

  if (
    edited.isAvailable !== undefined &&
    edited.isAvailable !== original.isAvailable
  ) {
    return true;
  }

  return false;
}
