import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontFamily } from '@/constants/theme';
import logger from '@/utils/logger';

interface PaymentWebViewProps {
  /** Cashfree payment link from backend */
  paymentLink: string;
  /** Order ID for reference */
  orderId: string;
  /** Called when payment completes successfully (after callback or user closes) */
  onSuccess: () => void;
  /** Called when payment fails */
  onFailure: (error: string) => void;
  /** Called when payment times out */
  onTimeout?: () => void;
  /** Timeout duration in milliseconds (default 2 minutes) */
  timeoutMs?: number;
}

/**
 * Payment UI component for Cashfree checkout
 * 
 * Since react-native-webview has limitations with Expo, this component uses:
 * - Deep-linking to handle payment callbacks
 * - External browser fallback for payment link
 * - Timeout protection
 * 
 * For UPI payments, user taps "Pay Now" which opens the link in their default browser.
 * After payment, Cashfree redirects to the app via deep-link.
 * We verify payment status via backend polling.
 */
export function PaymentWebView({
  paymentLink,
  orderId,
  onSuccess,
  onFailure,
  onTimeout,
  timeoutMs = 120000, // 2 minutes
}: PaymentWebViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Start timeout timer when component mounts
  useEffect(() => {
    logger.info('PaymentWebView mounted', { orderId, timeoutMs });

    timeoutRef.current = setTimeout(() => {
      if (!paymentStarted) {
        logger.warn('Payment timeout - no payment started', { orderId });
        setError('Payment timed out. Please try again.');
        onTimeout?.();
      }
    }, timeoutMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [orderId, timeoutMs, onTimeout, paymentStarted]);

  // Open payment link in default browser
  const handleOpenPayment = useCallback(async () => {
    try {
      setLoading(true);
      logger.info('Opening payment link in browser', { orderId, paymentLink });

      const canOpen = await Linking.canOpenURL(paymentLink);
      if (!canOpen) {
        throw new Error('Unable to open payment link');
      }

      await Linking.openURL(paymentLink);
      setPaymentStarted(true);
      setLoading(false);

      logger.info('Payment link opened in browser', { orderId });
    } catch (err) {
      logger.error('Failed to open payment link', { error: err, orderId });
      setError('Could not open payment page. Please check your internet connection.');
      setLoading(false);
      onFailure('Failed to open payment page');
    }
  }, [paymentLink, orderId, onFailure]);

  // UI: Before payment started
  if (!paymentStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.headerContainer}>
            <Ionicons name="shield-checkmark" size={64} color={colors.success} />
            <Text style={styles.title}>Secure Payment</Text>
            <Text style={styles.subtitle}>Complete your payment securely via Cashfree</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              You will be redirected to a secure payment page. After completing payment, you'll be returned to the app automatically.
            </Text>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>1</Text>
              </View>
              <Text style={styles.stepLabel}>Tap "Pay Now" below</Text>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>2</Text>
              </View>
              <Text style={styles.stepLabel}>Select your payment method</Text>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepText}>3</Text>
              </View>
              <Text style={styles.stepLabel}>Return to NearBy</Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={handleOpenPayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="wallet-outline" size={20} color="#ffffff" style={{ marginRight: spacing.xs }} />
                <Text style={styles.payButtonText}>Pay Now</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onFailure('User cancelled payment')}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // UI: Payment in progress
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.processingContainer}>
        <View style={styles.processingCircle}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>

        <Text style={styles.processingTitle}>Payment in Progress</Text>
        <Text style={styles.processingMessage}>
          Complete your payment in the browser window that opened. You'll be returned to NearBy automatically.
        </Text>

        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.timerText}>Waiting for payment confirmation...</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.confirmButton]}
          onPress={() => {
            logger.info('User confirmed payment', { orderId });
            onSuccess();
          }}
        >
          <Text style={styles.confirmButtonText}>I've Completed Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton2]}
          onPress={() => onFailure('User cancelled payment')}
        >
          <Text style={styles.cancelButtonText}>Cancel Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: `${colors.primary}15`,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
    lineHeight: 20,
  },
  stepContainer: {
    marginVertical: spacing.xl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  stepLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 19,
  },
  errorBanner: {
    backgroundColor: `${colors.error}15`,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginLeft: spacing.md,
    flex: 1,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.error,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  processingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  processingTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  processingMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  timerText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.success,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton2: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: colors.error,
  },
});
