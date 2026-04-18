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
  validateEditProductForm,
  validateEditProductField,
  hasProductChanges,
  rupeesToPaise,
  paiseToRupees,
  parsePriceInput,
} from '@/utils/editProductValidation';
import { Product } from '@/types/products';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

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

/**
 * useEditProduct hook
 * Manage product edit form state and API submission with retry logic
 */
export function useEditProduct(product: Product): UseEditProductState & UseEditProductActions {
  const shopId = useAuthStore((s) => s.shopId);
  const { updateProduct: updateProductStore } = useProductsStore();

  // Initialize form with current product values
  const initialFormData: EditProductFormData = {};

  const [formData, setFormData] = useState<EditProductFormData>(initialFormData);
  const [errors, setErrors] = useState<EditProductFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field when user starts editing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      // Clear submit error when user makes changes
      if (submitError) {
        setSubmitError(null);
      }

      logger.debug('Edit form field updated', { field, value });
    },
    [errors, submitError]
  );

  /**
   * Validate entire form
   * Returns true if valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const validationErrors = validateEditProductForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      logger.warn('Edit form validation failed', { errors: validationErrors });
      return false;
    }

    setErrors({});
    logger.info('Edit form validation passed');
    return true;
  }, [formData]);

  /**
   * Validate single field
   * Used for field-level validation (blur events)
   * Reads current formData value
   */
  const validateField = useCallback(
    (field: keyof EditProductFormData) => {
      const error = validateEditProductField(field, formData[field]);

      setErrors((prev) => ({
        ...prev,
        [field]: error || undefined,
      }));

      logger.debug('Edit field validated', { field, hasError: !!error });
    },
    [formData]
  );

  /**
   * Perform deferred validation after form state update
   * This validates the field that was just updated via setFormField
   */
  useEffect(() => {
    if (fieldToValidateRef.current && formData[fieldToValidateRef.current] !== undefined) {
      const field = fieldToValidateRef.current;
      const error = validateEditProductField(field, formData[field]);

      setErrors((prev) => ({
        ...prev,
        [field]: error || undefined,
      }));

      logger.debug('Deferred field validation', { field, hasError: !!error });
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
          formData,
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
  }, [product.id, formData]);

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

    if (formData.price !== undefined) {
      payload.price = formData.price;
    }

    if (formData.stockQty !== undefined) {
      payload.stock_quantity = formData.stockQty;
    }

    // Note: isAvailable is not part of the backend updateProductSchema
    // It's handled via is_available column on the product
    // For Sprint 12.4, we'll skip availability toggle in API
    // if (formData.isAvailable !== undefined) {
    //   payload.is_available = formData.isAvailable;
    // }

    return payload;
  }, [formData]);

  /**
   * Submit product edit form with retry logic
   * Returns updated product on success, null on failure
   */
  const submitProduct = useCallback(async (): Promise<Product | null> => {
    // Validate form before submitting
    if (!validateForm()) {
      logger.warn('Cannot submit - form has validation errors');
      return null;
    }

    // Check if there are actually changes
    const originalValues = {
      price: product.price,
      stockQty: product.stockQty,
      isAvailable: product.isActive,
    };

    if (!hasProductChanges(originalValues, formData)) {
      const error = 'Please change at least one field';
      setSubmitError(error);
      logger.warn('Submit cancelled - no changes', { productId: product.id });
      return null;
    }

    if (!shopId) {
      const error = 'Shop ID not available';
      setSubmitError(error);
      logger.error('Submit product failed', { error, productId: product.id });
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

        const isTimeoutError = lastError.message?.includes('timeout') ||
          lastError.message?.includes('ECONNABORTED');
        const isNetworkError = lastError.message?.includes('network') ||
          lastError.message?.includes('ECONNREFUSED');

        if ((isTimeoutError || isNetworkError) && attempt < MAX_RETRIES) {
          // Calculate exponential backoff: 1s, 2s, 4s
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);

          logger.warn('Edit product attempt failed, retrying', {
            productId: product.id,
            attempt,
            backoffMs,
            error: lastError.message,
          });

          setRetryCount(attempt);

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          // Non-retryable error or max retries reached
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
      } else if (
        errorMsg.includes('timeout') ||
        errorMsg.includes('network')
      ) {
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
    formData,
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
    setFormData({});
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
