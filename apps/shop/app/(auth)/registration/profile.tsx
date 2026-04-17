/**
 * Profile Screen (Step 1 of 5) — Shop name, category, address, coordinates
 * Validates and submits to POST /shops endpoint
 * On success: navigate to photo.tsx
 */

import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegistration } from '@/hooks/useRegistration';
import { InputField } from '@/components/common/InputField';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { SHOP_CATEGORIES } from '@/types/shop-registration';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import logger from '@/utils/logger';

export default function ProfileScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { formData, setField, submitProfile, loading, error, setError } =
    useRegistration();

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Shop name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Shop name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      errors.name = 'Shop name must not exceed 50 characters';
    }

    if (!formData.category) {
      errors.category = 'Please select a shop category';
    }

    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    } else if (formData.address.length < 10) {
      errors.address = 'Address must be at least 10 characters';
    } else if (formData.address.length > 200) {
      errors.address = 'Address must not exceed 200 characters';
    }

    if (formData.latitude === 0 || formData.longitude === 0) {
      errors.coordinates = 'Location coordinates are required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleContinue = useCallback(async () => {
    setError(null);

    if (!validateForm()) {
      logger.warn('Profile validation failed', { errors: validationErrors });
      return;
    }

    try {
      logger.info('Submitting profile', {
        name: formData.name,
        category: formData.category,
      });

      await submitProfile();
      router.push('(auth)/registration/photo');
    } catch (err) {
      logger.error('Profile submission failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [formData, submitProfile, validateForm, validationErrors, setError, router]);

  const handleSelectLocation = useCallback(() => {
    // In a real app, this would open Ola Maps location picker
    // For now, mock coordinates (Hyderabad)
    setField('latitude', 17.36662);
    setField('longitude', 78.47639);
    logger.info('Location set', {
      latitude: 17.36662,
      longitude: 78.47639,
    });
  }, [setField]);

  const getCategoryLabel = useCallback((): string => {
    if (!formData.category) return 'Select shop category';
    return (
      SHOP_CATEGORIES[
        formData.category as keyof typeof SHOP_CATEGORIES
      ] || formData.category
    );
  }, [formData.category]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {!isConnected && <OfflineBanner />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Tell us about your shop</Text>
          <Text style={styles.subtitle}>
            We'll use this info to create your shop profile
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Shop Name */}
          <InputField
            label="Shop Name"
            placeholder="Enter shop name (2-50 characters)"
            value={formData.name}
            onChangeText={(text) => {
              setField('name', text);
              if (validationErrors.name) {
                setValidationErrors((prev) => ({
                  ...prev,
                  name: undefined,
                }));
              }
            }}
            error={validationErrors.name}
            maxLength={50}
            editable={!loading}
          />

          {/* Category Picker */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Shop Category</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                validationErrors.category && styles.pickerButtonError,
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  !formData.category && styles.pickerButtonPlaceholder,
                ]}
              >
                {getCategoryLabel()}
              </Text>
            </TouchableOpacity>

            {validationErrors.category && (
              <Text style={styles.fieldErrorText}>
                {validationErrors.category}
              </Text>
            )}

            {/* Category options dropdown */}
            {showCategoryPicker && (
              <View style={styles.categoryList}>
                {Object.entries(SHOP_CATEGORIES).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryOption,
                      formData.category === key && styles.categoryOptionSelected,
                    ]}
                    onPress={() => {
                      setField('category', key);
                      setShowCategoryPicker(false);
                      if (validationErrors.category) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          category: undefined,
                        }));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        formData.category === key &&
                          styles.categoryOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Address */}
          <InputField
            label="Shop Address"
            placeholder="Enter complete address (10-200 characters)"
            value={formData.address}
            onChangeText={(text) => {
              setField('address', text);
              if (validationErrors.address) {
                setValidationErrors((prev) => ({
                  ...prev,
                  address: undefined,
                }));
              }
            }}
            error={validationErrors.address}
            maxLength={200}
            editable={!loading}
          />

          {/* Location Coordinates */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Location Coordinates</Text>
            <TouchableOpacity
              style={[
                styles.locationButton,
                validationErrors.coordinates && styles.locationButtonError,
              ]}
              onPress={handleSelectLocation}
              disabled={loading}
            >
              {formData.latitude !== 0 && formData.longitude !== 0 ? (
                <Text style={styles.locationButtonText}>
                  ✓ Location set ({formData.latitude.toFixed(4)},
                  {formData.longitude.toFixed(4)})
                </Text>
              ) : (
                <Text style={styles.locationButtonPlaceholder}>
                  Tap to set location
                </Text>
              )}
            </TouchableOpacity>

            {validationErrors.coordinates && (
              <Text style={styles.fieldErrorText}>
                {validationErrors.coordinates}
              </Text>
            )}
          </View>

          <PrimaryButton
            label={loading ? 'Creating shop...' : 'Next: Add Shop Photo'}
            onPress={handleContinue}
            loading={loading}
            disabled={loading || !isConnected}
            size="lg"
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },

  content: {
    flex: 1,
    padding: spacing.lg,
  },

  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  errorBox: {
    backgroundColor: `${colors.error}15`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },

  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
  },

  field: {
    marginBottom: spacing.md,
  },

  fieldLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  fieldErrorText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },

  pickerButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },

  pickerButtonError: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}10`,
  },

  pickerButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },

  pickerButtonPlaceholder: {
    color: colors.textTertiary,
  },

  categoryList: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    maxHeight: 300,
  },

  categoryOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  categoryOptionSelected: {
    backgroundColor: `${colors.primary}10`,
  },

  categoryOptionText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },

  categoryOptionTextSelected: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },

  locationButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },

  locationButtonError: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}10`,
  },

  locationButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.success,
  },

  locationButtonPlaceholder: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
  },

  btn: {
    marginTop: spacing.xl,
  },
});
