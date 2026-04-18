/**
 * Edit Product Screen (Task 12.4)
 * Allows shop owner to edit product price, stock, and availability
 * Features: Form validation, optimistic updates, retry logic, error handling
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { TextInput } from '@/components/common/TextInput';
import { useProductsStore } from '@/store/products';
import { useEditProduct } from '@/hooks/useEditProduct';
import { paiseToRupees, formatRupeesForDisplay, parsePriceInput } from '@/utils/editProductValidation';
import { formatCurrency } from '@/utils/formatters';
import { getProductDetail } from '@/services/products';
import logger from '@/utils/logger';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const products = useProductsStore((s) => s.products);
  const [product, setProduct] = useState(
    products.find((p) => p.id === id) || null
  );
  const [loading, setLoading] = useState(!product);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hook = useEditProduct(product!);

  // Initialize price display value
  const [priceDisplay, setPriceDisplay] = useState('');
  const [stockDisplay, setStockDisplay] = useState('');

  /**
   * Load product if not in store
   */
  useEffect(() => {
    if (product) {
      return;
    }

    async function loadProduct() {
      if (!id) {
        setLoadError('Product ID is missing');
        return;
      }

      try {
        const data = await getProductDetail(id);
        setProduct(data);
        hook.resetForm(data);
        logger.info('Product loaded for edit', { productId: id });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load product';
        setLoadError(message);
        logger.error('Failed to load product for edit', {
          productId: id,
          error: message,
        });
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, product, hook]);

  /**
   * Initialize display values when product loads
   */
  useEffect(() => {
    if (product && !priceDisplay && !stockDisplay) {
      setPriceDisplay(formatRupeesForDisplay(paiseToRupees(product.price)));
      setStockDisplay(product.stockQty.toString());
    }
  }, [product, priceDisplay, stockDisplay]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="loading"
            size={40}
            color={colors.primary}
          />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Product</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={40}
            color={colors.error}
          />
          <Text style={styles.errorTitle}>Error Loading Product</Text>
          <Text style={styles.errorMessage}>
            {loadError || 'Product not found'}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <PrimaryButton label="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const handlePriceChange = (value: string) => {
    setPriceDisplay(value);

    if (!value) {
      hook.setFormField('price', undefined);
      return;
    }

    const paise = parsePriceInput(value);
    if (paise > 0) {
      hook.setFormField('price', paise);
    }
  };

  const handleStockChange = (value: string) => {
    setStockDisplay(value);

    if (!value) {
      hook.setFormField('stockQty', undefined);
      return;
    }

    const qty = parseInt(value, 10);
    if (!isNaN(qty) && qty >= 0) {
      hook.setFormField('stockQty', qty);
    }
  };

  const handleSubmit = async () => {
    if (hook.isSubmitting) return;

    const result = await hook.submitProduct();
    if (result) {
      logger.info('Product updated successfully', { productId: product.id });

      // Show success message
      Alert.alert('Success', 'Product updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Product</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productUnit}>{product.stockQty} units</Text>
          </View>

          {/* Price Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Product Price</Text>
            <Text style={styles.helperText}>
              Current: {formatCurrency(product.price)}
            </Text>
            <View style={styles.inputWithIcon}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                placeholder="Enter price (e.g., 123.45)"
                value={priceDisplay}
                onChangeText={handlePriceChange}
                keyboardType="decimal-pad"
                editable={!hook.isSubmitting}
                onBlur={() => hook.validateField('price')}
                testID="price-input"
                style={styles.flex}
              />
            </View>
            {hook.errors.price && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color={colors.error}
                  style={styles.errorIcon}
                />
                <Text style={styles.errorText}>{hook.errors.price}</Text>
              </View>
            )}
          </View>

          {/* Stock Quantity Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Stock Quantity</Text>
            <Text style={styles.helperText}>Current: {product.stockQty} units</Text>
            <TextInput
              placeholder="Enter stock quantity"
              value={stockDisplay}
              onChangeText={handleStockChange}
              keyboardType="number-pad"
              editable={!hook.isSubmitting}
              onBlur={() => hook.validateField('stockQty')}
              testID="stock-input"
            />
            {hook.errors.stockQty && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color={colors.error}
                  style={styles.errorIcon}
                />
                <Text style={styles.errorText}>{hook.errors.stockQty}</Text>
              </View>
            )}
          </View>

          {/* Submit Error Alert */}
          {hook.submitError && (
            <View style={styles.alertContainer}>
              <View style={styles.alertContent}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={colors.error}
                  style={styles.alertIcon}
                />
                <View style={styles.alertTextContainer}>
                  <Text style={styles.alertTitle}>Update Failed</Text>
                  <Text style={styles.alertMessage}>{hook.submitError}</Text>
                </View>
              </View>
              {hook.retryCount > 0 && (
                <Text style={styles.retryText}>
                  Retrying... (Attempt {hook.retryCount + 1}/{3})
                </Text>
              )}
            </View>
          )}

          {/* Changes Status */}
          {!hook.hasChanges && Object.keys(hook.formData).length === 0 && (
            <Text style={styles.infoText}>
              Make changes to enable the update button
            </Text>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <PrimaryButton
            label={hook.isSubmitting ? `Updating... (${hook.retryCount})` : 'Update Product'}
            onPress={handleSubmit}
            disabled={!hook.hasChanges || hook.isSubmitting}
            testID="submit-button"
          />
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={hook.isSubmitting}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  productName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  productCategory: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  productUnit: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
  },
  fieldGroup: {
    marginVertical: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  currencySymbol: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  errorIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    flex: 1,
  },
  alertContainer: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  alertMessage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  retryText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.error,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
});
