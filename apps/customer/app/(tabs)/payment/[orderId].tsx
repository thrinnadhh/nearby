import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, Alert } from 'react-native';
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

    const initializePayment = async () => {
      try {
        logger.info('Initializing payment session', { orderId });
        setLoading(true);

        // Call backend to create Cashfree session
        const { sessionId, paymentLink } = await createPaymentSession(orderId);

        logger.info('Payment session created', { orderId, sessionId });
        setPaymentLink(paymentLink);
        setError(null);
      } catch (err) {
        logger.error('Failed to initialize payment', { orderId, error: err });
        setError(
          err instanceof Error ? err.message : 'Failed to load payment page. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
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
      <SafeAreaView style={{ flex: 1 }}>
        <PaymentWebView
          orderId={orderId || ''}
          paymentLink=""
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onTimeout={handlePaymentTimeout}
        />
        {/* PaymentWebView will show error UI */}
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
