import React, { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import logger from '@/utils/logger';

interface PaymentCallbackListenerProps {
  onPaymentCallback: (orderId: string, status: 'success' | 'failed') => void;
}

/**
 * Invisible component that listens for payment callback deep-links.
 * 
 * When Cashfree redirects back to the app after payment, this component
 * intercepts the deep-link URL and extracts the order ID and payment status.
 * 
 * Deep-link format: nearby-customer://payment-callback?orderId=UUID&status=success|failed
 * 
 * Mount this component at the app root level to catch callbacks from any screen.
 */
export function PaymentCallbackListener({ onPaymentCallback }: PaymentCallbackListenerProps) {
  // Parse deep-link URL
  const parseDeepLink = useCallback((url: string): { orderId: string; status: 'success' | 'failed' } | null => {
    try {
      // Expected format: nearby-customer://payment-callback?orderId=UUID&status=success
      const parsed = new URL(url);
      
      if (parsed.hostname !== 'payment-callback') {
        return null;
      }

      const orderId = parsed.searchParams.get('orderId');
      const status = parsed.searchParams.get('status');

      // Validate parameters
      if (!orderId || !status || (status !== 'success' && status !== 'failed')) {
        logger.warn('Invalid payment callback parameters', { orderId, status });
        return null;
      }

      return { orderId, status };
    } catch (error) {
      logger.error('Failed to parse payment callback URL', { error, url });
      return null;
    }
  }, []);

  // Listen for deep-link events
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      logger.info('Payment callback received', { url });
      const parsed = parseDeepLink(url);
      
      if (parsed) {
        onPaymentCallback(parsed.orderId, parsed.status);
      }
    });

    // Also check initial URL when component mounts (in case app was closed during payment)
    Linking.getInitialURL().then(url => {
      if (url) {
        logger.info('Initial payment callback URL found', { url });
        const parsed = parseDeepLink(url);
        
        if (parsed) {
          onPaymentCallback(parsed.orderId, parsed.status);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onPaymentCallback, parseDeepLink]);

  // This component is invisible
  return null;
}
