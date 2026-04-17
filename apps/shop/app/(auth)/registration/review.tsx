/**
 * Review Screen (Step 4 of 5) — Display registration summary and confirmation
 * Shows shop info, photo, KYC document status
 * Requires checkbox confirmation before submission
 * On success: navigate to waiting.tsx
 */

import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegistration } from '@/hooks/useRegistration';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { SHOP_CATEGORIES } from '@/types/shop-registration';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ReviewScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { formData, submitForReview, loading, error, setError } =
    useRegistration();

  const [confirmChecked, setConfirmChecked] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!confirmChecked) {
      setError('Please confirm that all information is correct');
      return;
    }

    setError(null);

    try {
      logger.info('Submitting registration for review');

      await submitForReview();

      logger.info('Registration submitted successfully');

      // Navigate to waiting screen
      router.push('(auth)/registration/waiting');
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Submission failed';
      setError(message);
      logger.error('Submission failed', { error: message });
    }
  }, [confirmChecked, submitForReview, router, setError]);

  const getCategoryLabel = (): string => {
    return (
      SHOP_CATEGORIES[
        formData.category as keyof typeof SHOP_CATEGORIES
      ] || formData.category
    );
  };

  const hasPhoto = !!formData.photoUrl;
  const hasKYC =
    !!formData.aadhaarUrl &&
    !!formData.gstUrl &&
    !!formData.bankUrl;

  return (
    <View style={styles.container}>
      {!isConnected && <OfflineBanner />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Review Your Information</Text>
          <Text style={styles.subtitle}>
            Please verify all details before submitting
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Shop Profile Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shop Information</Text>

            {/* Shop Details */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Shop Name</Text>
              <Text style={styles.detailValue}>{formData.name}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{getCategoryLabel()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{formData.address}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
              </Text>
            </View>
          </View>

          {/* Photo Status */}
          <View style={styles.card}>
            <View style={styles.checklistItem}>
              <View style={styles.checklistIcon}>
                {hasPhoto ? (
                  <>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={colors.success}
                    />
                    {formData.photoUrl && (
                      <Image
                        source={{ uri: formData.photoUrl }}
                        style={styles.photoThumb}
                        resizeMode="cover"
                      />
                    )}
                  </>
                ) : (
                  <MaterialCommunityIcons
                    name="checkbox-blank-circle-outline"
                    size={24}
                    color={colors.textTertiary}
                  />
                )}
              </View>
              <View style={styles.checklistContent}>
                <Text style={styles.checklistLabel}>Shop Photo</Text>
                <Text style={styles.checklistStatus}>
                  {hasPhoto ? '✓ Uploaded' : 'Optional'}
                </Text>
              </View>
            </View>
          </View>

          {/* KYC Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>KYC Documents</Text>

            <View style={styles.checklistItem}>
              <View style={styles.checklistIcon}>
                {formData.aadhaarUrl ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={colors.success}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                )}
              </View>
              <Text style={styles.checklistLabel}>Aadhaar Card</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.checklistItem}>
              <View style={styles.checklistIcon}>
                {formData.gstUrl ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={colors.success}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                )}
              </View>
              <Text style={styles.checklistLabel}>GST Certificate</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.checklistItem}>
              <View style={styles.checklistIcon}>
                {formData.bankUrl ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={colors.success}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                )}
              </View>
              <Text style={styles.checklistLabel}>Bank Account Proof</Text>
            </View>
          </View>

          {/* Confirmation Checkbox */}
          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              confirmChecked && styles.checkboxContainerChecked,
            ]}
            onPress={() => setConfirmChecked(!confirmChecked)}
          >
            <View style={styles.checkbox}>
              {confirmChecked && (
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={colors.white}
                />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm that all information provided is accurate and complete
            </Text>
          </TouchableOpacity>

          {/* Legal Text */}
          <View style={styles.legalBox}>
            <Text style={styles.legalText}>
              By submitting this form, you agree to our Terms of Service and Privacy
              Policy. Our team will review your KYC documents within 24 hours.
            </Text>
          </View>

          {/* Submit Button */}
          <PrimaryButton
            label={loading ? 'Submitting...' : 'Submit for Review'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !confirmChecked || !hasKYC || !isConnected}
            size="lg"
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </View>
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
    flexDirection: 'row',
    backgroundColor: `${colors.error}15`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },

  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginLeft: spacing.md,
    flex: 1,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },

  cardTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  detailLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    flex: 1,
  },

  detailValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  checklistIcon: {
    marginRight: spacing.md,
    position: 'relative',
  },

  photoThumb: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    position: 'absolute',
    right: -10,
    bottom: -10,
  },

  checklistContent: {
    flex: 1,
  },

  checklistLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },

  checklistStatus: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.success,
    marginTop: spacing.xs,
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },

  checkboxContainerChecked: {
    backgroundColor: `${colors.primary}10`,
    borderColor: colors.primary,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
  },

  checkboxLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    flex: 1,
  },

  legalBox: {
    backgroundColor: `${colors.info}10`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  legalText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  btn: {
    marginBottom: spacing.lg,
  },
});
