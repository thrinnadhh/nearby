import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { initiatePayment } from '@/services/orders';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';

// ─── Cashfree SDK Integration ─────────────────────────────────────────────────
// NOTE: Cashfree React Native SDK requires linking/native setup
// For now, we use WebView approach with fallback to payment link

interface PaymentSession {
  paymentSessionId: string;
  paymentLink: string;
  cashfreeOrderId: string;
}

interface PaymentInitResponse {
  success: boolean;
  data?: {
    orderId: string;
    paymentStatus: string;
    paymentMethod: string;
    cashfreeOrderId: string;
    paymentSessionId: string;
    paymentLink: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Payment screen for UPI/Card checkout via Cashfree
 * Uses WebView to open Cashfree checkout link
 * Polling backend for payment status confirmation
 */
export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const activeOrder = useOrdersStore((s) => s.activeOrder);
  const setActiveOrder = useOrdersStore((s) => s.setActiveOrder);
  const token = useAuthStore((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [pollingPayment, setPollingPayment] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // ── Initialize payment session ──────────────────────────────────────────────

  useEffect(() => {
    initializePayment();
  }, [orderId]);

  const initializePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!orderId) {
        throw new Error('Order ID missing');
      }

      // Call backend to get Cashfree payment session
      const response = await initiatePayment(orderId);

      if (response.session_url) {
        setPaymentLink(response.session_url);
        setPaymentSession({
          paymentSessionId: response.order_id,
          paymentLink: response.session_url,
          cashfreeOrderId: orderId,
        });

        // Auto-open payment link (for demo; production would use WebView)
        // In production, you'd use:
        // - react-native-webview for embedded checkout
        // - @react-native-camera/camera for QR scanning
        // - Linking.openURL() for deep-linking to Cashfree app

        // For now, show instructions to user
      } else {
        throw new Error('Failed to get payment session');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(message);
      console.error('[PaymentScreen] Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Polling for payment status ──────────────────────────────────────────────
  /**
   * In production, Cashfree webhook would notify backend of payment completion.
   * For demo/testing, we poll every 3 seconds for max 60 seconds.
   */
  const pollPaymentStatus = async () => {
    if (!orderId || pollCount > 20) {
      // Stop polling after 60 seconds (~20 polls)
      setPollingPayment(false);
      return;
    }

    try {
      // Call backend to check payment status
      // This endpoint returns the latest order with payment_status
      const response = await fetch(
        `https://api.nearby.app/api/v1/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && data.data?.payment_status === 'completed') {
        // Payment successful!
        setActiveOrder(data.data);
        setPollingPayment(false);

        Alert.alert('Payment successful!', 'Your order has been confirmed.', [
          {
            text: 'View order',
            onPress: () => {
              router.replace(`/(tabs)/order-confirmed/${orderId}`);
            },
          },
        ]);
      } else {
        // Still pending, schedule next poll
        setPollCount(pollCount + 1);
        setTimeout(pollPaymentStatus, 3000);
      }
    } catch (err) {
      console.error('[PaymentScreen] Poll error:', err);
      // Continue polling on error
      setTimeout(pollPaymentStatus, 3000);
    }
  };

  const handleProceedToPayment = async () => {
    if (!paymentLink) {
      Alert.alert('Error', 'Payment link not available');
      return;
    }

    setPollingPayment(true);
    setPollCount(0);

    // In production, open payment link via:
    // 1. Embedded WebView for Hosted Checkout
    // 2. Deep link to Cashfree mobile app (if installed)
    // 3. Or fallback to browser opening payment_link

    try {
      // For demo: simulate opening payment in browser/external app
      // In real app: use Linking.openURL(paymentLink)
      // or react-native-webview for embedded checkout

      // Start polling for payment result
      pollPaymentStatus();

      Alert.alert(
        'Opening payment gateway',
        'Please complete payment in the browser/app that opens.',
        [
          {
            text: 'Cancel',
            onPress: () => setPollingPayment(false),
          },
          {
            text: 'Retry',
            onPress: () => pollPaymentStatus(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to open payment gateway');
      setPollingPayment(false);
      console.error('[PaymentScreen] Payment open error:', err);
    }
  };

  const handleRetry = () => {
    initializePayment();
  };

  const handleCancel = () => {
    Alert.alert('Cancel payment?', 'You can retry payment from order details.', [
      { text: 'Keep trying', style: 'cancel' },
      {
        text: 'Go back',
        style: 'destructive',
        onPress: () => {
          router.back();
        },
      },
    ]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Initializing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Payment initiation failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!paymentSession) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Payment Details */}
      <View style={styles.containerScroll}>
        {/* Order summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order ID</Text>
            <Text style={styles.summaryValue}>{orderId}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValueBold}>
              ₹{activeOrder ? (activeOrder.total_paise / 100).toFixed(2) : '0.00'}
            </Text>
          </View>
        </View>

        {/* Payment methods info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Methods</Text>
          <Text style={styles.paymentMethodInfo}>
            💳 Credit Card • 📱 Debit Card • 🎯 UPI • 📲 Net Banking
          </Text>
          <Text style={styles.paymentMethodNote}>
            Secure checkout powered by Cashfree. Your payment information is encrypted.
          </Text>
        </View>

        {/* Processing info */}
        {pollingPayment && (
          <View style={styles.card}>
            <View style={styles.processingInfo}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.processingText}>
                {pollCount > 0 ? `Checking payment status...` : 'Opening payment gateway...'}
              </Text>
            </View>
          </View>
        )}

        {/* Security info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={styles.securityText}>
            Your payment is secure and encrypted with SSL
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.proceedBtn}
          onPress={handleProceedToPayment}
          disabled={pollingPayment}
        >
          {pollingPayment ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Text style={styles.proceedText}>Proceed to payment</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={pollingPayment}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  // ── Loading / Error states ──────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // ── Content area ────────────────────────────────────────────────────────────
  containerScroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  summaryValueBold: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  paymentMethodInfo: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.6,
  },
  paymentMethodNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: fontSize.xs * 1.5,
  },

  processingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  processingText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.primary,
  },

  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}10`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  securityText: {
    flex: 1,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },

  // ── Footer buttons ──────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  proceedText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.white,
  },

  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  retryText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
});
