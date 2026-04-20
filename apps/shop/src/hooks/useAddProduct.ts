/**
 * useAddProduct hook — manage product creation form state and submission
 * Handles form field management, image selection, validation, and API submission
 * Integrates with useProductsStore for real-time updates
 */

import { useState, useCallback, useRef } from 'react';
import { client } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import {
  ProductFormData,
  ProductFormErrors,
  validateProductForm,
  validateProductField,
  validateImageFile,
  toApiPayload,
  IMAGE_CONSTRAINTS,
} from '@/utils/productValidation';
import { Product } from '@/types/products';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseAddProductState {
  formData: ProductFormData;
  errors: ProductFormErrors;
  isSubmitting: boolean;
  submitError: string | null;
  imagePreview: { uri: string; size: number } | null;
}

interface UseAddProductActions {
  setFormField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  setImage: (image: {
    uri: string;
    name: string;
    type: string;
    size: number;
  } | null) => void;
  validateForm: () => boolean;
  validateField: (field: keyof ProductFormData) => void;
  submitProduct: () => Promise<Product | null>;
  clearForm: () => void;
  clearError: () => void;
}

const INITIAL_FORM_DATA: ProductFormData = {
  image: null,
  name: '',
  description: '',
  category: '',
  price: 0,
  stockQty: 0,
  unit: '',
};

/**
 * useAddProduct hook
 * Manage product creation form state and API submission
 */
export function useAddProduct(): UseAddProductState & UseAddProductActions {
  const shopId = useAuthStore((s) => s.shopId);
  const { updateProduct } = useProductsStore();

  const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ uri: string; size: number } | null>(null);

  // Keep a ref to the latest formData for use in callbacks that may have stale closures
  const formDataRef = useRef<ProductFormData>(INITIAL_FORM_DATA);
  formDataRef.current = formData;

  /**
   * Set a single form field
   * Clears field error when user starts typing
   */
  const setFormField = useCallback(
    <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
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

      logger.debug('Form field updated', { field, value });
    },
    []
  );

  /**
   * Set image from picker
   * Validates image file before accepting
   */
  const setImage = useCallback(
    (image: {
      uri: string;
      name: string;
      type: string;
      size: number;
    } | null) => {
      if (!image) {
        setFormData((prev) => {
          const updated = { ...prev, image: null };
          formDataRef.current = updated;
          return updated;
        });
        setImagePreview(null);
        logger.info('Image cleared');
        return;
      }

      // Validate image
      const validation = validateImageFile(image);
      if (!validation.valid) {
        setErrors((prev) => ({
          ...prev,
          image: validation.error,
        }));
        logger.warn('Image validation failed', { error: validation.error });
        return;
      }

      // Check size warning
      if (image.size > IMAGE_CONSTRAINTS.TARGET_SIZE) {
        logger.info('Large image selected', {
          size: image.size,
          targetSize: IMAGE_CONSTRAINTS.TARGET_SIZE,
        });
      }

      setFormData((prev) => {
        const updated = {
          ...prev,
          image: {
            uri: image.uri,
            name: image.name,
            type: image.type,
          },
        };
        formDataRef.current = updated;
        return updated;
      });

      setImagePreview({
        uri: image.uri,
        size: image.size,
      });

      // Clear image error
      setErrors((prev) => {
        if (prev.image) {
          return { ...prev, image: undefined };
        }
        return prev;
      });

      logger.info('Image selected', {
        name: image.name,
        size: image.size,
        type: image.type,
      });
    },
    []
  );

  /**
   * Validate entire form
   * Returns true if valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const currentFormData = formDataRef.current;
    const validationErrors = validateProductForm(currentFormData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      logger.warn('Form validation failed', { errors: validationErrors });
      return false;
    }

    setErrors({});
    logger.info('Form validation passed');
    return true;
  }, []);

  /**
   * Validate single field
   * Used for field-level validation
   * Always reads the latest value from formDataRef to avoid stale closure issues
   */
  const validateField = useCallback(
    (field: keyof ProductFormData) => {
      // Use formDataRef to get the most up-to-date value
      const latestValue = formDataRef.current[field];
      const error = validateProductField(field, latestValue);

      setErrors((prev) => ({
        ...prev,
        [field]: error || undefined,
      }));

      logger.debug('Field validated', { field, hasError: !!error });
    },
    []
  );

  /**
   * Submit product creation form
   * Returns created product on success, null on failure
   */
  const submitProduct = useCallback(async (): Promise<Product | null> => {
    // Validate form before submitting
    if (!validateForm()) {
      logger.warn('Cannot submit - form has validation errors');
      return null;
    }

    if (!shopId) {
      const error = 'Shop ID not available';
      setSubmitError(error);
      logger.error('Submit product failed', { error });
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build FormData for multipart upload
      const formDataPayload = new FormData();
      const currentFormData = formDataRef.current;

      // Add text fields
      const payload = toApiPayload(currentFormData);
      Object.entries(payload).forEach(([key, value]) => {
        formDataPayload.append(key, String(value));
      });

      // Add image file
      if (currentFormData.image && imagePreview) {
        // Fetch the image file from URI
        const response = await fetch(currentFormData.image.uri);
        const blob = await response.blob();

        // Create File object (or Blob for React Native)
        formDataPayload.append(
          'image',
          blob,
          `product-${Date.now()}.${
            currentFormData.image.type === 'image/jpeg'
              ? 'jpg'
              : currentFormData.image.type === 'image/png'
              ? 'png'
              : 'webp'
          }`
        );

        logger.info('Image added to form data', {
          name: currentFormData.image.name,
          type: currentFormData.image.type,
        });
      }

      // Submit to backend
      const url = `/shops/${shopId}/products`;
      const { data } = await client.post<{
        success: boolean;
        data: Product;
      }>(url, formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const createdProduct = data.data;

      logger.info('Product created successfully', {
        productId: createdProduct.id,
        shopId,
      });

      // Update products store
      if (updateProduct) {
        updateProduct(createdProduct.id, createdProduct);
      }

      return createdProduct;
    } catch (err) {
      let errorMessage = 'Failed to create product. Please try again.';

      if (err instanceof AppError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setSubmitError(errorMessage);

      logger.error('Product creation failed', {
        error: errorMessage,
        shopId,
      });

      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [shopId, imagePreview, validateForm, updateProduct]);

  /**
   * Clear entire form to initial state
   */
  const clearForm = useCallback(() => {
    formDataRef.current = INITIAL_FORM_DATA;
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setSubmitError(null);
    setImagePreview(null);
    logger.info('Product form cleared');
  }, []);

  /**
   * Clear submit error
   */
  const clearError = useCallback(() => {
    setSubmitError(null);
  }, []);

  return {
    // State
    formData,
    errors,
    isSubmitting,
    submitError,
    imagePreview,

    // Actions
    setFormField,
    setImage,
    validateForm,
    validateField,
    submitProduct,
    clearForm,
    clearError,
  };
}
