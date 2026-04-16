import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { createPaymentSession, pollPaymentStatus, validateCallback } from '@/services/payments';
import { PaymentWebView } from '@/components/PaymentWebView';
import { PaymentCallbackListener } from '@/components/PaymentCallbackListener';
import logger from '@/utils/logger';

/**
 * Payment Screen (Task 9.2)
 * 
 * Shown when user selects UPI payment and clicks "Place Order"
 * 
 * Flow:
 * 1. User lands on this screen
 * 2. Backend creates Cashfree payment session
 * 3. PaymentWebView displays "Pay Now" button
 * 4. User taps "Pay Now" → payment link opens in browser
 * 5. User completes payment in browser
 * 6. Cashfree redirects to app via deep-link (nearby-customer://payment-callback)
 * 7. PaymentCallbackListener catches redirect
 * 8. Backend polling confirms payment status
 * 9. Navigate to order-confirmed or show error
 * 
 * Polling timeout: 2 minutes (120s)
 * Payment link timeout: 2 minutes
 */
export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { activeOrder } = useOrdersStore();

  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Initialize payment session on mount
  useEffect(() => {
    if (!orderId || !token) {
      setError('Missing order ID or authentication');
      return;
    }

    initializePayment();
  }, [orderId, token]);

  const initializePayment = useCallback(async () => {
    if (!orderId || !token) {
      setError('Missing order ID or authentication');
      return;
    }

    try {
      logger.info('Initializing payment session', { orderId });
      setLoading(true);
      setError(null);

      // Call backend to create Cashfree session
      const { sessionId, paymentLink } = await createPaymentSession(orderId);

      logger.info('Payment session created', { orderId, sessionId });
      setPaymentLink(paymentLink);
    } catch (err) {
      logger.error('Failed to initialize payment', { orderId, error: err });
      setError(
        err instanceof Error ? err.message : 'Failed to load payment page. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  // Handle payment success (called when user completes payment)
  const handlePaymentSuccess = useCallback(async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID not found');
      return;
    }

    try {
      logger.info('Payment success - polling for confirmation', { orderId });
      setVerifying(true);

      // Poll backend to confirm payment is complete
      // Cashfree webhook should have already updated the order
      const result = await pollPaymentStatus(orderId);

      if (result.status === 'SUCCESS') {
        logger.info('Payment verified', { orderId });
        setVerifying(false);

        // Navigate to order tracking
        setTimeout(() => {
          router.replace(`/(tabs)/tracking/${orderId}`);
        }, 500);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (err) {
      logger.error('Payment verification failed', { orderId, error: err });
      setError('Payment verification failed. Please contact support.');
      setVerifying(false);
    }
  }, [orderId, router]);

  // Handle payment failure
  const handlePaymentFailure = useCallback(
    (errorMessage: string) => {
      logger.warn('Payment failed', { orderId, error: errorMessage });
      setError(errorMessage || 'Payment failed. Please try again.');
    },
    [orderId]
  );

  // Handle payment timeout
  const handlePaymentTimeout = useCallback(() => {
    logger.warn('Payment timeout', { orderId });
    setError('Payment page timed out. Please try again.');
  }, [orderId]);

  // Handle deep-link callback from Cashfree
  const handlePaymentCallback = useCallback(
    (callbackOrderId: string, status: 'success' | 'failed') => {
      logger.info('Payment callback received', { callbackOrderId, status, expectedOrderId: orderId });

      // Validate callback
      const { valid, error: validationError } = validateCallback(callbackOrderId, status);
      if (!valid) {
        logger.error('Invalid payment callback', { error: validationError });
        setError('Invalid payment callback. Please try again.');
        return;
      }

      // Verify callback is for the current order
      if (callbackOrderId !== orderId) {
        logger.warn('Payment callback for different order', { callbackOrderId, orderId });
        return;
      }

      if (status === 'success') {
        handlePaymentSuccess();
      } else {
        handlePaymentFailure('Payment was not completed');
      }
    },
    [orderId, handlePaymentSuccess, handlePaymentFailure]
  );

  // Show error message if payment initialization failed
  if (error && !loading && !paymentLink) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Payment Initialization Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => initializePayment()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (loading && !paymentLink) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading payment page...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show payment WebView once session is created
  return (
    <>
      <SafeAreaView style={{ flex: 1 }}>
        {paymentLink && (
          <PaymentWebView
            orderId={orderId || ''}
            paymentLink={paymentLink}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
            onTimeout={handlePaymentTimeout}
          />
        )}
      </SafeAreaView>

      {/* Listen for payment callbacks from Cashfree redirect */}
      <PaymentCallbackListener onPaymentCallback={handlePaymentCallback} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
