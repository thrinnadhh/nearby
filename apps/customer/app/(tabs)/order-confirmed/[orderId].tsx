import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';
import { getOrder } from '@/services/orders';
import { paise } from '@/utils/currency';

const ACCEPTANCE_TIMEOUT = 180; // 3 minutes in seconds

/**
 * Order Confirmed Screen (Task 9.3)
 * 
 * Shown after:
 * 1. COD order creation (payment method = 'cod')
 * 2. UPI payment completion (from payment/[orderId] → order-confirmed)
 * 
 * Displays:
 * - Order ID and summary
 * - Countdown timer (180s) for shop acceptance
 * - Real-time order status polling
 * - Auto-navigation to tracking on shop acceptance
 * 
 * Flow:
 * order-pending (0-180s) → shop-accepts → /tracking/[orderId]
 * order-pending (180s timeout) → show error → allow retry/cancel
 */
export default function OrderConfirmedScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { setActiveOrder } = useOrdersStore();

  const [order, setOrder] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(ACCEPTANCE_TIMEOUT);
  const [pollError, setPollError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    try {
      if (!orderId || !token) return;

      const data = await getOrder(orderId);
      setOrder(data);
      setPollError(null);

      // Check if shop has accepted
      if (data.order_status === 'accepted') {
        setActiveOrder(data);
        // Navigate to tracking screen
        router.replace(`/(tabs)/tracking/${orderId}`);
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch order status';
      setPollError(message);
      console.error('Order fetch error:', message);
    }
  }, [orderId, token, router, setActiveOrder]);

  // Timer effect: countdown from 180 to 0
  useEffect(() => {
    if (hasTimedOut || !orderId) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setHasTimedOut(true);
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasTimedOut, orderId]);

  // Polling effect: check order status every 5 seconds
  useEffect(() => {
    if (hasTimedOut || !orderId || !token) return;

    fetchOrderDetails();
    const pollInterval = setInterval(fetchOrderDetails, 5000);
    return () => clearInterval(pollInterval);
  }, [orderId, token, hasTimedOut, fetchOrderDetails]);

  const handleRetry = () => {
    setTimeRemaining(ACCEPTANCE_TIMEOUT);
    setHasTimedOut(false);
    setPollError(null);
    fetchOrderDetails();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order?',
      'This will cancel your order and initiate a refund if you already paid.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!orderId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Order ID not found</Text>
      </SafeAreaView>
    );
  }

  // Timeout state
  if (hasTimedOut) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.timeoutCard}>
            <Text style={styles.timeoutEmoji}>⏰</Text>
            <Text style={styles.timeoutTitle}>Shop Didn't Respond</Text>
            <Text style={styles.timeoutMessage}>
              The shop hasn't accepted your order within 3 minutes. Please try again or contact support.
            </Text>

            {order && (
              <View style={styles.orderSummary}>
                <Text style={styles.summaryLabel}>Order ID</Text>
                <Text style={styles.orderId}>{order.id}</Text>

                <Text style={[styles.summaryLabel, { marginTop: 16 }]}>
                  Amount
                </Text>
                <Text style={styles.amount}>{paise(order.total_amount)}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRetry}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleCancel}
          >
            <Text style={styles.secondaryButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main content state
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Timer Section */}
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Shop is reviewing your order...</Text>

          <View style={styles.timerCard}>
            <Text style={styles.timerValue}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.timerSubtext}>
              {timeRemaining > 60
                ? `${Math.floor(timeRemaining / 60)} min remaining`
                : `${timeRemaining} seconds remaining`}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(timeRemaining / ACCEPTANCE_TIMEOUT) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Error message */}
        {pollError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {pollError}</Text>
            <Text style={styles.errorBannerSubtext}>Still checking status...</Text>
          </View>
        )}

        {/* Order Summary */}
        {order && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            <View style={styles.summaryCard}>
              {/* Order ID */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order ID</Text>
                <Text style={styles.orderId}>{order.id}</Text>
              </View>

              {/* Shop Name */}
              {order.shop?.name && (
                <View style={[styles.summaryRow, styles.rowBorder]}>
                  <Text style={styles.summaryLabel}>Shop</Text>
                  <Text style={styles.shopName}>{order.shop.name}</Text>
                </View>
              )}

              {/* Items Count */}
              <View style={[styles.summaryRow, styles.rowBorder]}>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.itemCount}>
                  {order.order_items?.length || 0} item
                  {order.order_items?.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Payment Method */}
              <View style={[styles.summaryRow, styles.rowBorder]}>
                <Text style={styles.summaryLabel}>Payment</Text>
                <Text style={styles.paymentMethod}>
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI'}
                </Text>
              </View>

              {/* Total Amount */}
              <View style={[styles.summaryRow, styles.rowBorder]}>
                <Text style={styles.summaryLabelBold}>Total</Text>
                <Text style={styles.amountBold}>{paise(order.total_amount)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* What happens next */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What Happens Next?</Text>
          <View style={styles.infoList}>
            <InfoItem number="1" text="Shop receives & reviews your order" />
            <InfoItem number="2" text="Shop confirms and starts packing" />
            <InfoItem number="3" text="Delivery partner will be assigned" />
            <InfoItem number="4" text="Track your order in real-time" />
          </View>
        </View>

        {/* Contact support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            Need help? Contact the shop directly or reach out to our support team.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleCancel}
        >
          <Text style={styles.secondaryButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Helper component for "What Happens Next" list
function InfoItem({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoBadge}>
        <Text style={styles.infoBadgeText}>{number}</Text>
      </View>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Timer section
  timerSection: {
    marginBottom: 24,
    paddingTop: 8,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  timerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e8eaed',
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },

  // Progress bar
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  errorBannerSubtext: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 4,
  },

  // Summary section
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryLabelBold: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'monospace',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    maxWidth: '60%',
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  amountBold: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Info section
  infoSection: {
    marginBottom: 24,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 12,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
    flex: 1,
    paddingTop: 5,
  },

  // Support section
  supportSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  supportText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },

  // Footer buttons
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Timeout state
  timeoutCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginVertical: 24,
  },
  timeoutEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  timeoutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeoutMessage: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  orderSummary: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 32,
  },
});
