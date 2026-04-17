/**
 * Add Product Screen — shop owner adds a single product
 * Integrated image picker, form validation, and API submission
 * Real-time Socket.IO sync with product catalogue
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useAddProduct } from '@/hooks/useAddProduct';
import { formatPrice, parsePriceToPaise } from '@/utils/productValidation';
import { ImagePickerModal } from '@/components/product/ImagePickerModal';
import { CategoryPicker } from '@/components/product/CategoryPicker';
import { UnitPicker } from '@/components/product/UnitPicker';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import logger from '@/utils/logger';

export default function AddProductScreen() {
  const router = useRouter();
  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    imagePreview,
    setFormField,
    setImage,
    validateField,
    submitProduct,
    clearForm,
  } = useAddProduct();

  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState('');

  /**
   * Handle image selection from picker modal
   */
  const handleImageSelected = useCallback(
    (image: { uri: string; name: string; type: string; size: number }) => {
      setImage(image);
      logger.info('Image selected in screen', { name: image.name });
    },
    [setImage]
  );

  /**
   * Handle changing image
   */
  const handleChangeImage = useCallback(() => {
    setImagePickerVisible(true);
    logger.info('Change image initiated');
  }, []);

  /**
   * Handle removing image
   */
  const handleRemoveImage = useCallback(() => {
    setImage(null);
    logger.info('Image removed');
  }, [setImage]);

  /**
   * Handle price field change
   * Converts display rupees to paise for storage
   */
  const handlePriceChange = useCallback(
    (text: string) => {
      setPriceDisplay(text);

      // Convert to paise
      const paise = parsePriceToPaise(text);
      setFormField('price', paise);

      // Validate field
      validateField('price');
    },
    [setFormField, validateField]
  );

  /**
   * Handle stock quantity change
   */
  const handleStockChange = useCallback(
    (text: string) => {
      const qty = parseInt(text, 10) || 0;
      setFormField('stockQty', qty);
      validateField('stockQty');
    },
    [setFormField, validateField]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    try {
      logger.info('Product form submission initiated');

      const createdProduct = await submitProduct();
      if (!createdProduct) {
        logger.warn('Product submission returned null');
        return;
      }

      logger.info('Product created successfully', {
        productId: createdProduct.id,
      });

      // Show success toast
      Alert.alert(
        'Success!',
        'Product added! Check your catalogue.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearForm();
              router.back();
              logger.info('Navigated back to catalogue');
            },
          },
        ]
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Product submission error', { error: errorMsg });
      Alert.alert('Error', 'Failed to create product. Please try again.');
    }
  }, [submitProduct, clearForm, router]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    if (
      formData.name ||
      formData.description ||
      formData.category ||
      formData.price ||
      formData.stockQty ||
      formData.unit ||
      formData.image
    ) {
      Alert.alert('Discard Changes?', 'Are you sure you want to discard this product?', [
        { text: 'Keep Editing', onPress: () => {} },
        {
          text: 'Discard',
          onPress: () => {
            clearForm();
            router.back();
            logger.info('Product form discarded');
          },
          style: 'destructive',
        },
      ]);
    } else {
      router.back();
    }
  }, [formData, clearForm, router]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isSubmitting}
              testID="add-product-back"
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Product</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
          >
            {/* Error alert */}
            {submitError && (
              <View style={styles.errorAlert}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={colors.error}
                  style={styles.errorAlertIcon}
                />
                <Text style={styles.errorAlertText}>{submitError}</Text>
              </View>
            )}

            {/* Image section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Image</Text>

              {imagePreview ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imagePreview.uri }}
                    style={styles.imagePreview}
                    testID="product-image-preview"
                  />
                  <View style={styles.imageActionButtons}>
                    <TouchableOpacity
                      style={styles.imageActionButton}
                      onPress={handleChangeImage}
                      disabled={isSubmitting}
                      testID="change-image-button"
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={20}
                        color={colors.white}
                      />
                      <Text style={styles.imageActionButtonText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageActionButton, styles.imageActionButtonDanger]}
                      onPress={handleRemoveImage}
                      disabled={isSubmitting}
                      testID="remove-image-button"
                    >
                      <MaterialCommunityIcons
                        name="trash-can"
                        size={20}
                        color={colors.white}
                      />
                      <Text style={styles.imageActionButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePlaceholder, errors.image && styles.imagePlaceholderError]}
                  onPress={() => setImagePickerVisible(true)}
                  disabled={isSubmitting}
                  testID="select-image-button"
                >
                  <MaterialCommunityIcons
                    name="cloud-upload"
                    size={40}
                    color={colors.primary}
                  />
                  <Text style={styles.imagePlaceholderText}>Select Image</Text>
                  <Text style={styles.imagePlaceholderSubtext}>
                    Max 5MB • JPEG, PNG, WebP
                  </Text>
                </TouchableOpacity>
              )}

              {errors.image && (
                <Text style={styles.errorText}>{errors.image}</Text>
              )}
            </View>

            {/* Form fields section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Details</Text>

              {/* Product name */}
              <View style={styles.formField}>
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.name && styles.textInputError,
                  ]}
                  placeholder="e.g., Fresh Tomatoes"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormField('name', text);
                    validateField('name');
                  }}
                  onBlur={() => validateField('name')}
                  editable={!isSubmitting}
                  testID="product-name-input"
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              {/* Description */}
              <View style={styles.formField}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textInputMultiline,
                    errors.description && styles.textInputError,
                  ]}
                  placeholder="e.g., Fresh, organic tomatoes sourced locally"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.description}
                  onChangeText={(text) => {
                    setFormField('description', text);
                    validateField('description');
                  }}
                  onBlur={() => validateField('description')}
                  multiline
                  numberOfLines={3}
                  editable={!isSubmitting}
                  testID="product-description-input"
                />
                <Text style={styles.charCount}>
                  {formData.description.length}/500 characters
                </Text>
                {errors.description && (
                  <Text style={styles.errorText}>{errors.description}</Text>
                )}
              </View>

              {/* Category */}
              <CategoryPicker
                value={formData.category}
                onValueChange={(category) => {
                  setFormField('category', category);
                  validateField('category');
                }}
                error={errors.category}
                testID="product-category-picker"
              />

              {/* Price */}
              <View style={styles.formField}>
                <Text style={styles.label}>Price (₹) *</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceCurrency}>₹</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.priceInput,
                      errors.price && styles.textInputError,
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={priceDisplay}
                    onChangeText={handlePriceChange}
                    onBlur={() => validateField('price')}
                    keyboardType="decimal-pad"
                    editable={!isSubmitting}
                    testID="product-price-input"
                  />
                </View>
                {errors.price && (
                  <Text style={styles.errorText}>{errors.price}</Text>
                )}
              </View>

              {/* Stock quantity */}
              <View style={styles.formField}>
                <Text style={styles.label}>Stock Quantity *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.stockQty && styles.textInputError,
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.stockQty.toString()}
                  onChangeText={handleStockChange}
                  onBlur={() => validateField('stockQty')}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  testID="product-stock-input"
                />
                {errors.stockQty && (
                  <Text style={styles.errorText}>{errors.stockQty}</Text>
                )}
              </View>

              {/* Unit */}
              <UnitPicker
                value={formData.unit}
                onValueChange={(unit) => {
                  setFormField('unit', unit);
                  validateField('unit');
                }}
                error={errors.unit}
                testID="product-unit-picker"
              />
            </View>

            {/* Spacing for bottom buttons */}
            <View style={styles.spacer} />
          </ScrollView>

          {/* Bottom buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleCancel}
              disabled={isSubmitting}
              testID="add-product-cancel"
            >
              <Text style={styles.buttonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              testID="add-product-submit"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color={colors.white}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Add Product</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Image picker modal */}
        <ImagePickerModal
          visible={imagePickerVisible}
          onImageSelected={handleImageSelected}
          onClose={() => setImagePickerVisible(false)}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  errorAlert: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorAlertIcon: {
    marginRight: spacing.md,
  },
  errorAlertText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.error,
    flex: 1,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  imagePlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  imagePlaceholderError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  imagePlaceholderText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  imagePlaceholderSubtext: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  imageActionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  imageActionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageActionButtonDanger: {
    backgroundColor: colors.error,
  },
  imageActionButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    marginLeft: spacing.sm,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  textInputError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  textInputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingLeft: spacing.md,
    backgroundColor: colors.white,
  },
  priceCurrency: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
  },
  charCount: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
  spacer: {
    height: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },
  buttonTextSecondary: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
});
