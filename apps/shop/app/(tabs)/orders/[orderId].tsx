/**
 * Order Detail Screen — displays full order info, items, status timeline
 *
 * Route: (tabs)/orders/[orderId].tsx
 * Purpose: Show order details, allow navigation to packing checklist
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { Order } from '@/types/orders';
import { AppError } from '@/types/common';
import { useOrders } from '@/hooks/useOrders';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { CustomerInfoCard } from '@/components/order/CustomerInfoCard';
import { OrderItemsPanel } from '@/components/order/OrderItemsPanel';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import logger from '@/utils/logger';

interface OrderDetailProps {
  orderId: string;
  order: Order | null;
  loading: boolean;
  error: string | null;
}

/**
 * OrderStatusTimeline wrapper component
 * Shows progression through order states
 */
function StatusTimelineSection({ order }: { order: Order }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Status</Text>
      <OrderStatusTimeline order={order} />
    </View>
  );
}

/**
 * Order items section
 * Lists all products in the order
 */
function OrderItemsSection({ order }: { order: Order }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
      <OrderItemsPanel items={order.items} />
    </View>
  );
}

/**
 * Order summary section
 * Shows totals and payment mode
 */
function OrderSummarySection({ order }: { order: Order }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(order.subtotal)}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Delivery Fee</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(order.deliveryFee)}
        </Text>
      </View>
      <View style={[styles.summaryRow, styles.summaryRowTotal]}>
        <Text style={styles.summaryLabelTotal}>Total</Text>
        <Text style={styles.summaryValueTotal}>
          {formatCurrency(order.total)}
        </Text>
      </View>
      <View style={styles.paymentInfo}>
        <MaterialCommunityIcons
          name={order.paymentMode === 'upi' ? 'credit-card' : 'wallet-cash'}
          size={16}
          color={colors.primary}
        />
        <Text style={styles.paymentText}>
          {order.paymentMode.toUpperCase()}
          {order.paymentStatus && ` - ${order.paymentStatus}`}
        </Text>
      </View>
    </View>
  );
}

/**
 * Order timestamps section
 * Shows when order was created and accepted
 */
function TimestampsSection({ order }: { order: Order }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Timeline</Text>
      <View style={styles.timelineRow}>
        <Text style={styles.timelineLabel}>Created</Text>
        <Text style={styles.timelineValue}>{formatDateTime(order.createdAt)}</Text>
      </View>
      {order.acceptedAt && (
        <View style={styles.timelineRow}>
          <Text style={styles.timelineLabel}>Accepted</Text>
          <Text style={styles.timelineValue}>
            {formatDateTime(order.acceptedAt)}
          </Text>
        </View>
      )}
      {order.rejectionReason && (
        <View style={styles.timelineRow}>
          <Text style={styles.timelineLabel}>Rejected Reason</Text>
          <Text style={styles.timelineValue}>{order.rejectionReason}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Action buttons section
 * Navigate to packing checklist if order is accepted or packing
 */
function ActionsSection({ order }: { order: Order }) {
  const router = useRouter();
  const canViewChecklist =
    order.status === 'accepted' || order.status === 'packing';

  if (!canViewChecklist) {
    return null;
  }

  return (
    <View style={styles.actionsSection}>
      <PrimaryButton
        label="Go to Packing Checklist"
        onPress={() => {
          logger.info('Navigate to packing checklist', { orderId: order.id });
          router.push({
            pathname: '/(tabs)/index',
            params: { orderId: order.id, openChecklist: 'true' },
          });
        }}
        variant="primary"
        size="lg"
      />
    </View>
  );
}

/**
 * Main Order Detail Screen
 * Displays comprehensive order information with status timeline
 */
function OrderDetailScreenContent() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { fetchOrderDetail } = useOrders();
  const { isOnline } = useNetworkStatus();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order detail on mount
  useEffect(() => {
    const loadOrderDetail = async () => {
      if (!orderId) {
        logger.warn('OrderDetailScreen: orderId not provided');
        setError('Order ID not found');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const orderData = await fetchOrderDetail(orderId);
        setOrder(orderData);
        logger.info('Order detail loaded', { orderId });
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to load order details';
        setError(message);
        logger.error('Failed to load order detail', { orderId, error: message });
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetail();
  }, [orderId, fetchOrderDetail]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.error}
        />
        <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        <PrimaryButton
          label="Go Back"
          onPress={() => router.back()}
          variant="primary"
          size="md"
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {!isOnline && <OfflineBanner />}

      {/* Header with order ID and status badge */}
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              logger.info('Back pressed from order detail');
              router.back();
            }}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Order Details</Text>
            <Text style={styles.orderId}>#{order.id.slice(0, 12)}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                order.status === 'pending'
                  ? colors.warning
                  : order.status === 'accepted'
                    ? colors.info
                    : order.status === 'packing'
                      ? colors.primary
                      : order.status === 'ready'
                        ? colors.success
                        : colors.textTertiary,
            },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Customer info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <CustomerInfoCard
          name={order.customerName}
          phone={order.customerPhone}
          address={order.deliveryAddress}
        />
      </View>

      {/* Status timeline */}
      <StatusTimelineSection order={order} />

      {/* Order items */}
      <OrderItemsSection order={order} />

      {/* Order summary */}
      <OrderSummarySection order={order} />

      {/* Timestamps */}
      <TimestampsSection order={order} />

      {/* Actions */}
      <ActionsSection order={order} />

      <View style={styles.spacer} />
    </ScrollView>
  );
}

/**
 * Wrap with ErrorBoundary for production safety
 */
export default function OrderDetailScreen() {
  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.safeArea}>
        <OrderDetailScreenContent />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.error,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  orderId: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },
  section: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  summaryLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  summaryLabelTotal: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontFamily: fontFamily.semiBold,
  },
  summaryValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },
  summaryValueTotal: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  paymentText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  timelineLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  timelineValue: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },
  actionsSection: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  spacer: {
    height: spacing.xxl,
  },
});
