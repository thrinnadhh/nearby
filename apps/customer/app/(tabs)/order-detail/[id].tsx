import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { getOrderDetail, cancelOrder } from '@/services/orders';
import { paise } from '@/utils/currency';
import logger from '@/utils/logger';
import { OrderTimeline } from '@/components/OrderTimeline';
import { OrderItemsPanel } from '@/components/OrderItemsPanel';
import { PartnerInfoCard } from '@/components/PartnerInfoCard';
import { RefundStatusBadge } from '@/components/RefundStatusBadge';
import { CancelOrderModal } from './cancel-modal';
import type { Order } from '@/types';

/**
 * Order Detail Screen (Task 10.2)
 * 
 * Displays full order information including:
 * - Timeline of status events
 * - Itemized product breakdown
 * - Delivery partner information
 * - Refund status if cancelled
 * - Action buttons (cancel, review, reorder)
 */

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { activeOrder, setActiveOrder } = useOrdersStore();

  // State
  const [order, setOrder] = useState<Order | null>(activeOrder || null);
  const [isLoading, setIsLoading] = useState(!activeOrder);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch order if not in store
  const fetchOrder = useCallback(async () => {
    if (!id || !token) return;

    try {
      setIsLoading(true);
      const data = await getOrderDetail(id, token);
      setOrder(data);
      setActiveOrder(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load order';
      logger.error('fetch order detail failed', { orderId: id, error: message });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id, token, setActiveOrder]);

  // Only fetch on mount. Excluding activeOrder from deps is intentional:
  // after cancel sets activeOrder(null), we don't want to re-fetch a cancelled order.
  useEffect(() => {
    if (!activeOrder && id) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCancelOrder = async (reason: string) => {
    if (!order || !token) return;

    setIsCancelling(true);
    try {
      await cancelOrder(order.id, reason, token);
      setShowCancelModal(false);
      
      Alert.alert(
        'Order Cancelled',
        'Your order has been cancelled. Refund may take 3-5 business days.',
        [
          {
            text: 'OK',
            onPress: () => {
              setActiveOrder(null);
              router.push('/(tabs)/order-history');
            },
          },
        ]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel order';
      logger.error('cancel order failed', { orderId: order.id, error: message });
      Alert.alert('Cancellation Failed', message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReview = () => {
    if (!order) return;
    router.push({
      pathname: '/(tabs)/reviews/compose/[orderId]',
      params: { orderId: order.id },
    });
  };

  const handleReorder = () => {
    if (!order) return;
    // This will be handled by the reorder flow in Task 10.4
    router.push({
      pathname: '/(tabs)/order-history',
      params: { reorderId: order.id },
    });
  };

  const handleContactShop = () => {
    if (!order?.shop_name) return;
    // In a real app, this would open a chat screen
    Alert.alert('Shop Contact', `Contact with ${order.shop_name} would open chat here`);
  };

  const handleContactPartner = () => {
    // In a real app, this would open a delivery partner chat/call
    Alert.alert(
      'Delivery Partner Contact',
      'Contact with delivery partner would open call/chat here'
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons
            name="alert-circle"
            size={48}
            color={colors.error}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={styles.errorTitle}>Unable to Load Order</Text>
          <Text style={styles.errorMessage}>{error || 'Order not found'}</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => {
              if (id) {
                fetchOrder();
              } else {
                router.back();
              }
            }}
          >
            <Text style={styles.buttonText}>{id ? 'Retry' : 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canCancel =
    order.status === 'pending' || order.status === 'accepted';
  const canReview =
    order.status === 'delivered';
  const canReorder =
    order.status === 'delivered';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.section}>
          <View style={styles.orderHeaderRow}>
            <View>
              <Text style={styles.orderId}>
                Order #{order.id.slice(0, 8).toUpperCase()}
              </Text>
              <Text style={styles.orderDate}>
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  dateStyle: 'long',
                })}
              </Text>
            </View>
            <View style={styles.orderTotalBox}>
              <Text style={styles.orderTotalLabel}>Total</Text>
              <Text style={styles.orderTotal}>{paise(order.total_paise)}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <OrderTimeline order={order} />
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <OrderItemsPanel items={order.items} />
        </View>

        {/* Refund Status (if cancelled) */}
        {order.status === 'cancelled' && (
          <View style={styles.section}>
            <RefundStatusBadge 
              orderId={order.id}
              status={order.refund_status || 'processing'}
              refundAmount={order.refund_amount}
            />
          </View>
        )}

        {/* Delivery Partner (if assigned) */}
        {['assigned', 'picked_up', 'out_for_delivery', 'delivered'].includes(
          order.status
        ) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Partner</Text>
            <PartnerInfoCard 
              partner={order.delivery_partner}
              onContact={handleContactPartner} 
            />
          </View>
        )}

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressBox}>
            <Ionicons
              name="location"
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: spacing.sm }}
            />
            <Text style={styles.addressText}>
              {order.delivery_address || 'Address not available'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {canCancel && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setShowCancelModal(true)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                  <Text style={styles.secondaryButtonText}>Cancel Order</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canReview && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleReview}
            >
              <Ionicons name="star" size={16} color={colors.surface} />
              <Text style={styles.buttonText}>Write Review</Text>
            </TouchableOpacity>
          )}

          {canReorder && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleReorder}
            >
              <Ionicons name="refresh" size={16} color={colors.surface} />
              <Text style={styles.buttonText}>Reorder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={handleContactShop}
          >
            <Ionicons name="chatbubble" size={16} color={colors.primary} />
            <Text style={styles.outlineButtonText}>Contact Shop</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Cancel Modal */}
      <CancelOrderModal
        visible={showCancelModal}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancelOrder}
        isLoading={isCancelling}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  section: {
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
    marginBottom: spacing.md,
  },

  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  orderId: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
  },

  orderDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  orderTotalBox: {
    alignItems: 'flex-end',
  },

  orderTotalLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  orderTotal: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.bold,
    marginTop: spacing.xs,
  },

  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  addressText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
  },

  actionsSection: {
    gap: spacing.md,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },

  primaryButton: {
    backgroundColor: colors.primary,
  },

  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.surface,
    fontFamily: fontFamily.semiBold,
  },

  secondaryButton: {
    backgroundColor: colors.error,
  },

  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.surface,
    fontFamily: fontFamily.semiBold,
  },

  outlineButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  outlineButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },

  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.error,
    fontFamily: fontFamily.bold,
    marginBottom: spacing.sm,
  },

  errorMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
});
