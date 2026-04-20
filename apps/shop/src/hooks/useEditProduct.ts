/**
 * useEditProduct hook — manage product edit form state and submission
 * Handles form field management, validation, API submission, and error recovery
 * Integrates with useProductsStore for optimistic updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import {
  EditProductFormData,
  EditProductFormErrors,
  validateEditProductField,
  hasProductChanges,
} from '@/utils/editProductValidation';
import { Product } from '@/types/products';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';
import Joi from 'joi';

interface UseEditProductState {
  formData: EditProductFormData;
  errors: EditProductFormErrors;
  isSubmitting: boolean;
  submitError: string | null;
  hasChanges: boolean;
  retryCount: number;
}

interface UseEditProductActions {
  setFormField: <K extends keyof EditProductFormData>(
    field: K,
    value: EditProductFormData[K]
  ) => void;
  validateForm: () => boolean;
  validateField: (field: keyof EditProductFormData) => void;
  submitProduct: () => Promise<Product | null>;
  clearError: () => void;
  resetForm: (product: Product) => void;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const OFFLINE_STORAGE_KEY_PREFIX = 'edit_product_pending_';

// Field-level validators (without the .min(1) object constraint)
const priceValidator = Joi.number().integer().min(1).max(999999900);
const stockQtyValidator = Joi.number().integer().min(0);
const isAvailableValidator = Joi.boolean();

/**
 * Validate only field-level constraints (not the "at least one field" constraint)
 * Returns errors object with field-specific messages
 */
function validateFieldsOnly(formData: EditProductFormData): EditProductFormErrors {
  const errors: EditProductFormErrors = {};

  if (formData.price !== undefined) {
    const { error } = priceValidator.validate(formData.price);
    if (error) {
      errors.price = error.message;
    }
  }

  if (formData.stockQty !== undefined) {
    const { error } = stockQtyValidator.validate(formData.stockQty);
    if (error) {
      errors.stockQty = error.message;
    }
  }

  if (formData.isAvailable !== undefined) {
    const { error } = isAvailableValidator.validate(formData.isAvailable);
    if (error) {
      errors.isAvailable = error.message;
    }
  }

  return errors;
}

/**
 * useEditProduct hook
 * Manage product edit form state and API submission with retry logic
 */
export function useEditProduct(product: Product): UseEditProductState & UseEditProductActions {
  const shopId = useAuthStore((s) => s.shopId);
  const { updateProduct: updateProductStore } = useProductsStore();

  // Keep ref to latest formData to avoid stale closures
  const formDataRef = useRef<EditProductFormData>({});

  const [formData, setFormData] = useState<EditProductFormData>({});
  const [errors, setErrors] = useState<EditProductFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  formDataRef.current = formData;

  // Ref to track field that needs validation after state update
  const fieldToValidateRef = useRef<keyof EditProductFormData | null>(null);

  /**
   * Set a single form field
   * Clears field error when user starts typing
   */
  const setFormField = useCallback(
    <K extends keyof EditProductFormData>(field: K, value: EditProductFormData[K]) => {
      // Mark field for validation after state update
      fieldToValidateRef.current = field;

      setFormData((prev) => {
        const updated = { ...prev, [field]: value };
        formDataRef.current = updated;
        return updated;
      });

      // Clear error for this field when user starts editing
      setErrors((prev) => {
        if (prev[field]) {
          return { ...prev, [field]: undefined };
        }
        return prev;
      });

      // Clear submit error when user makes changes
      setSubmitError((prev) => (prev ? null : prev));

      logger.debug('Edit form field updated', { field, value });
    },
    []
  );

  /**
   * Validate entire form (field-level only)
   * Returns true if valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const currentFormData = formDataRef.current;
    const validationErrors = validateFieldsOnly(currentFormData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      logger.warn('Edit form validation failed', { errors: validationErrors });
      return false;
    }

    setErrors({});
    logger.info('Edit form validation passed');
    return true;
  }, []);

  /**
   * Validate single field
   * Used for field-level validation (blur events)
   * Reads current formData value
   */
  const validateField = useCallback(
    (field: keyof EditProductFormData) => {
      const latestValue = formDataRef.current[field];
      const error = validateEditProductField(field, latestValue);

      setErrors((prev) => ({
        ...prev,
        [field]: error || undefined,
      }));

      logger.debug('Edit field validated', { field, hasError: !!error });
    },
    []
  );

  /**
   * Perform deferred validation after form state update
   * This validates the field that was just updated via setFormField
   */
  useEffect(() => {
    if (fieldToValidateRef.current !== null) {
      const field = fieldToValidateRef.current;
      const latestValue = formDataRef.current[field];

      if (latestValue !== undefined) {
        const error = validateEditProductField(field, latestValue);

        setErrors((prev) => ({
          ...prev,
          [field]: error || undefined,
        }));

        logger.debug('Deferred field validation', { field, hasError: !!error });
      }

      fieldToValidateRef.current = null;
    }
  }, [formData]);

  /**
   * Save pending changes to AsyncStorage for offline support
   */
  const savePendingChanges = useCallback(async () => {
    try {
      const storageKey = `${OFFLINE_STORAGE_KEY_PREFIX}${product.id}`;
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          productId: product.id,
          formData: formDataRef.current,
          timestamp: Date.now(),
        })
      );
      logger.info('Pending changes saved to storage', { productId: product.id });
    } catch (err) {
      logger.warn('Failed to save pending changes', {
        productId: product.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }, [product.id]);

  /**
   * Clear pending changes from AsyncStorage
   */
  const clearPendingChanges = useCallback(async () => {
    try {
      const storageKey = `${OFFLINE_STORAGE_KEY_PREFIX}${product.id}`;
      await AsyncStorage.removeItem(storageKey);
      logger.info('Pending changes cleared', { productId: product.id });
    } catch (err) {
      logger.warn('Failed to clear pending changes', {
        productId: product.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }, [product.id]);

  /**
   * Build API payload from form data
   * Converts field names to backend format
   */
  const buildApiPayload = useCallback((): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    const currentFormData = formDataRef.current;

    if (currentFormData.price !== undefined) {
      payload.price = currentFormData.price;
    }

    if (currentFormData.stockQty !== undefined) {
      payload.stock_quantity = currentFormData.stockQty;
    }

    return payload;
  }, []);

  /**
   * Submit product edit form with retry logic
   * Returns updated product on success, null on failure
   *
   * Order of checks:
   * 1. Has changes? (business logic — sets submitError if not)
   * 2. Field validation passes? (schema — sets errors on fields)
   * 3. ShopId available? (auth — sets submitError)
   * 4. Submit with retry
   */
  const submitProduct = useCallback(async (): Promise<Product | null> => {
    const currentFormData = formDataRef.current;

    // 1. Check if there are actually changes FIRST (before field validation)
    const originalValues = {
      price: product.price,
      stockQty: product.stockQty,
      isAvailable: product.isActive,
    };

    if (!hasProductChanges(originalValues, currentFormData)) {
      const errorMsg = 'Please change at least one field';
      setSubmitError(errorMsg);
      logger.warn('Submit cancelled - no changes', { productId: product.id });
      return null;
    }

    // 2. Validate field-level constraints
    if (!validateForm()) {
      logger.warn('Cannot submit - form has validation errors');
      return null;
    }

    // 3. Check shopId
    if (!shopId) {
      const errorMsg = 'Shop ID not available';
      setSubmitError(errorMsg);
      logger.error('Submit product failed', { error: errorMsg, productId: product.id });
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setRetryCount(0);

    // Save pending changes for offline support
    await savePendingChanges();

    let attempt = 0;
    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    while (attempt < MAX_RETRIES) {
      try {
        const payload = buildApiPayload();

        logger.info('Submitting product edit', {
          productId: product.id,
          payload,
          attempt: attempt + 1,
        });

        const response = await client.patch<{
          success: boolean;
          data: Product;
        }>(`/products/${product.id}`, payload);

        if (!response.data.success || !response.data.data) {
          throw new AppError(
            'INVALID_RESPONSE',
            'Server returned invalid response'
          );
        }

        const updatedProduct = response.data.data;

        // Optimistic update in store
        updateProductStore(product.id, {
          price: updatedProduct.price,
          stockQty: updatedProduct.stockQty,
          isActive: updatedProduct.isActive,
          updatedAt: updatedProduct.updatedAt,
        });

        // Clear pending changes on success
        await clearPendingChanges();

        logger.info('Product edited successfully', { productId: product.id });
        setIsSubmitting(false);
        return updatedProduct;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        attempt += 1;

        const isTimeoutError =
          lastError.message?.includes('timeout') ||
          lastError.message?.includes('ECONNABORTED');
        const isNetworkError =
          lastError.message?.includes('network') ||
          lastError.message?.includes('ECONNREFUSED');

        if ((isTimeoutError || isNetworkError) && attempt < MAX_RETRIES) {
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);

          logger.warn('Edit product attempt failed, retrying', {
            productId: product.id,
            attempt,
            backoffMs,
            error: lastError.message,
          });

          setRetryCount(attempt);

          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      let userFacingError = 'Failed to update product. Please try again.';

      const errorMsg = lastError.message?.toLowerCase() || '';

      if (errorMsg.includes('404')) {
        userFacingError =
          'Product not found. It may have been deleted by another user.';
      } else if (errorMsg.includes('403')) {
        userFacingError = 'You are not authorized to edit this product.';
      } else if (errorMsg.includes('401')) {
        userFacingError = 'Your session expired. Please log in again.';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
        userFacingError =
          'Network error. Please check your connection and try again.';
      }

      setSubmitError(userFacingError);
      logger.error('Edit product failed after retries', {
        productId: product.id,
        error: lastError.message,
        attempts: attempt,
      });
    }

    setIsSubmitting(false);
    return null;
  }, [
    product,
    shopId,
    validateForm,
    buildApiPayload,
    updateProductStore,
    savePendingChanges,
    clearPendingChanges,
  ]);

  /**
   * Clear submit error
   */
  const clearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  /**
   * Reset form to original product values
   * Used when opening the edit screen
   */
  const resetForm = useCallback((prod: Product) => {
    const empty: EditProductFormData = {};
    formDataRef.current = empty;
    setFormData(empty);
    setErrors({});
    setSubmitError(null);
    setRetryCount(0);
    fieldToValidateRef.current = null;
    logger.info('Edit form reset', { productId: prod.id });
  }, []);

  /**
   * Check if form has changes
   */
  const hasChanges = hasProductChanges(
    {
      price: product.price,
      stockQty: product.stockQty,
      isAvailable: product.isActive,
    },
    formData
  );

  return {
    formData,
    errors,
    isSubmitting,
    submitError,
    hasChanges,
    retryCount,
    setFormField,
    validateForm,
    validateField,
    submitProduct,
    clearError,
    resetForm,
  };
}
