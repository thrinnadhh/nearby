/**
 * Product validation schema and utilities
 * Matches backend createProductSchema for client-side validation
 * Shop-owner-friendly error messages
 */

import Joi from 'joi';
import { AppError } from '@/types/common';

// Product categories matching backend
export const PRODUCT_CATEGORIES = [
  'grocery',
  'vegetable',
  'fruit',
  'dairy',
  'medicine',
  'personal_care',
  'household',
  'electronics',
  'clothing',
  'food_beverage',
  'pet_supplies',
  'other',
] as const;

// Product units matching backend
export const PRODUCT_UNITS = [
  'kg',
  'gram',
  'litre',
  'ml',
  'piece',
  'pack',
  'dozen',
  'box',
] as const;

// Category display names for shop owner
export const CATEGORY_LABELS: Record<string, string> = {
  grocery: 'Grocery',
  vegetable: 'Vegetables',
  fruit: 'Fruits',
  dairy: 'Dairy & Milk',
  medicine: 'Medicines',
  personal_care: 'Personal Care',
  household: 'Household Items',
  electronics: 'Electronics',
  clothing: 'Clothing',
  food_beverage: 'Food & Beverages',
  pet_supplies: 'Pet Supplies',
  other: 'Other',
};

// Unit display names
export const UNIT_LABELS: Record<string, string> = {
  kg: 'Kilogram (kg)',
  gram: 'Gram (gm)',
  litre: 'Litre (L)',
  ml: 'Millilitre (ml)',
  piece: 'Piece',
  pack: 'Pack',
  dozen: 'Dozen',
  box: 'Box',
};

// Image constraints
export const IMAGE_CONSTRAINTS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_WIDTH: 1200,
  MAX_HEIGHT: 1200,
  TARGET_QUALITY: 85, // 0-100
  TARGET_SIZE: 1 * 1024 * 1024, // 1 MB target after compression
};

/**
 * Validation schema for product form
 * Matches backend createProductSchema
 */
export const productFormSchema = Joi.object({
  image: Joi.object({
    uri: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.string().required(),
  })
    .required()
    .messages({
      'any.required': 'Product image is required',
    }),
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Product name is required',
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name must not exceed 100 characters',
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .required()
    .messages({
      'string.empty': 'Please select a product category',
      'any.only': 'Please select a valid product category',
    }),
  price: Joi.number()
    .integer()
    .min(1)
    .max(999999900)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.integer': 'Price must be a whole number',
      'number.min': 'Price must be at least ₹0.01',
      'number.max': 'Price must not exceed ₹9,999,999',
    }),
  stockQty: Joi.number()
    .integer()
    .min(0)
    .max(9999)
    .required()
    .messages({
      'number.base': 'Stock quantity must be a number',
      'number.integer': 'Stock quantity must be a whole number',
      'number.min': 'Stock quantity must be 0 or greater',
      'number.max': 'Stock quantity must not exceed 9999',
    }),
  unit: Joi.string()
    .valid(...PRODUCT_UNITS)
    .required()
    .messages({
      'string.empty': 'Please select a unit',
      'any.only': 'Please select a valid unit',
    }),
});

/**
 * Validation state — maps field names to error messages
 */
export interface ProductFormErrors {
  image?: string;
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  stockQty?: string;
  unit?: string;
}

/**
 * Product form data
 */
export interface ProductFormData {
  image: {
    uri: string;
    name: string;
    type: string;
  } | null;
  name: string;
  description: string;
  category: string;
  price: number;
  stockQty: number;
  unit: string;
}

/**
 * Validate entire form
 * Returns errors object (empty if valid)
 */
export function validateProductForm(formData: ProductFormData): ProductFormErrors {
  const errors: ProductFormErrors = {};

  // Validate against Joi schema
  const { error, value } = productFormSchema.validate(formData, {
    abortEarly: false,
    convert: false,
  });

  if (error) {
    // Convert Joi errors to field-level errors
    error.details.forEach((detail: any) => {
      const field = detail.path[0] as keyof ProductFormErrors;
      if (field) {
        errors[field] = detail.message;
      }
    });
  }

  return errors;
}

/**
 * Validate single field
 * Used for field-level validation in form
 */
export function validateProductField(
  field: keyof ProductFormData,
  value: unknown
): string | null {
  const schema = Joi.object({
    [field]: productFormSchema.extract(field),
  });

  const { error } = schema.validate(
    { [field]: value },
    { abortEarly: true, convert: false }
  );

  if (error) {
    return error.details[0]?.message || null;
  }

  return null;
}

/**
 * Validate image file size and format
 * Client-side before upload
 */
export function validateImageFile(
  file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  }
): { valid: boolean; error?: string } {
  // Check MIME type
  const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are allowed',
    };
  }

  // Check file size if available
  if (file.size && file.size > IMAGE_CONSTRAINTS.MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image is ${sizeMB}MB. Maximum size is 5MB.`,
    };
  }

  return { valid: true };
}

/**
 * Format price in paise to rupees for display
 */
export function formatPrice(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toFixed(2)}`;
}

/**
 * Parse price input (in rupees) to paise
 */
export function parsePriceToPaise(rupees: string | number): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) {
    return 0;
  }
  return Math.round(num * 100);
}

/**
 * Convert form data to API payload
 * Transforms field names to match backend schema
 */
export function toApiPayload(formData: ProductFormData): Record<string, unknown> {
  return {
    name: formData.name.trim(),
    description: formData.description.trim(),
    category: formData.category,
    price: formData.price,
    stock_quantity: formData.stockQty,
    unit: formData.unit,
    // image will be sent as multipart form file
  };
}

/**
 * Check if image file is likely too large before compression
 * User-friendly warning
 */
export function getImageSizeWarning(sizeBytes: number): string | null {
  const sizeMB = sizeBytes / (1024 * 1024);

  if (sizeMB > 5) {
    return `Image is ${sizeMB.toFixed(1)}MB. Maximum 5MB allowed.`;
  }

  if (sizeMB > 3) {
    return `Image is large (${sizeMB.toFixed(1)}MB). It will be compressed to improve upload speed.`;
  }

  return null;
}
