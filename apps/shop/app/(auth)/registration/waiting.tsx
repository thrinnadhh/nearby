/**
 * Waiting Screen (Step 5 of 5) — Under review status page
 * Polls KYC status every 5 seconds
 * Auto-redirects when approved, shows rejection reason
 * If rejected: allows resubmit flow (back to kyc screen)
 */

import { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegistration } from '@/hooks/useRegistration';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { KYCStatusDisplay } from '@/components/registration/KYCStatusDisplay';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

// Configuration constants
const KYC_APPROVED_REDIRECT_DELAY_MS = 2000; // Show approval message for 2s before redirecting
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import logger from '@/utils/logger';

export default function WaitingScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { shopId } = useRegistration();
  const {
    status,
    reason,
    approvedAt,
    rejectedAt,
    isApproved,
    isRejected,
    isPending,
    isPolling,
    pollCount,
    startPolling,
    stopPolling,
    refetch,
  } = useKYCStatus(shopId || '');

  // Start polling on mount
  useEffect(() => {
    if (shopId && isConnected) {
      startPolling();
      logger.info('KYC status polling started', { shopId });
    }

    return () => {
      stopPolling();
    };
  }, [shopId, isConnected, startPolling, stopPolling]);

  // Auto-redirect when approved
  useEffect(() => {
    if (isApproved) {
      logger.info('KYC approved, redirecting to dashboard', { shopId });

      // Give user a moment to see the approval message
      const timer = setTimeout(() => {
        router.push('(tabs)');
      }, KYC_APPROVED_REDIRECT_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [isApproved, router, shopId]);

  const handleResubmit = useCallback(() => {
    logger.info('Resubmitting KYC', { shopId });
    router.push('(auth)/registration/kyc');
  }, [router, shopId]);

  const handleRefresh = useCallback(async () => {
    logger.info('Manually refreshing KYC status', { shopId });
    await refetch();
  }, [refetch, shopId]);

  if (!shopId) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={56}
          color={colors.error}
        />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>Shop ID not found. Please try again.</Text>
        <PrimaryButton
          label="Go Back"
          onPress={() => router.push('(auth)/login')}
          size="lg"
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isConnected && <OfflineBanner />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl onRefresh={handleRefresh} refreshing={false} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.title}>Registration Submitted</Text>
          <Text style={styles.subtitle}>
            Your KYC is being verified by our team
          </Text>

          {/* Status Display */}
          <KYCStatusDisplay
            status={status === 'loading' ? 'pending' : status}
            reason={reason}
            approvedAt={approvedAt}
            rejectedAt={rejectedAt}
          />

          {/* Polling Info */}
          {isPending && isPolling && (
            <View style={styles.pollingInfo}>
              <ActivityIndicator size="small" color={colors.info} />
              <Text style={styles.pollingText}>
                Checking status... (checked {pollCount} times)
              </Text>
            </View>
          )}

          {/* Approval Message */}
          {isApproved && (
            <View style={styles.approvalBox}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.approvalText}>
                Congratulations! Your KYC has been approved. Redirecting...
              </Text>
            </View>
          )}

          {/* Rejection Options */}
          {isRejected && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionTitle}>What You Can Do</Text>
              <Text style={styles.rejectionDesc}>
                Your KYC was rejected. You can review the reason above and resubmit with corrected documents.
              </Text>

              <PrimaryButton
                label="Resubmit Documents"
                onPress={handleResubmit}
                size="lg"
                style={styles.resubmitButton}
              />

              <TouchableOpacity
                style={styles.helpLink}
                onPress={() => {
                  // Open help/support
                  logger.info('Support link tapped');
                }}
              >
                <MaterialCommunityIcons
                  name="help-circle-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.helpLinkText}>
                  Need help? Contact support
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Information Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={colors.info}
            />
            <Text style={styles.infoText}>
              Checks usually complete within 24 hours. You'll receive an SMS notification once approved.
            </Text>
          </View>

          {/* Manual Refresh Button */}
          {isPending && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.refreshButtonText}>Manual Refresh</Text>
            </TouchableOpacity>
          )}
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

  pollingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.info}15`,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },

  pollingText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.info,
    marginLeft: spacing.md,
  },

  approvalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  approvalText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.success,
    marginLeft: spacing.md,
    flex: 1,
  },

  rejectionBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },

  rejectionTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  rejectionDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },

  resubmitButton: {
    marginBottom: spacing.md,
  },

  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },

  helpLinkText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.primary,
    marginLeft: spacing.md,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: `${colors.info}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  infoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.info,
    marginLeft: spacing.md,
    flex: 1,
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },

  refreshButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.primary,
    marginLeft: spacing.md,
  },

  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  errorTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.error,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  errorMessage: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  errorButton: {
    marginTop: spacing.lg,
  },
});
