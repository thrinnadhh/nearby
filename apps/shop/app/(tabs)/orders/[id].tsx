/**
 * Order Detail Screen (Task 11.7) — View order and accept/reject
 * Fetches fresh order data from backend (server-authoritative)
 * Shows items, customer info, and accept/reject buttons
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Text,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Order } from '@/types/orders';
import { OrderStatus } from '@/types/shop';
import { useOrders } from '@/hooks/useOrders';
import { useOrdersStore } from '@/store/orders';
import { OrderItemsPanel } from '@/components/order/OrderItemsPanel';
import { CustomerInfoCard } from '@/components/order/CustomerInfoCard';
import { CountdownTimer } from '@/components/order/CountdownTimer';
import { OrderStatusTimeline } from '@/components/order/OrderStatusTimeline';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import logger from '@/utils/logger';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { fetchOrderDetail, acceptCurrentOrder, rejectCurrentOrder } =
    useOrders();
  const { activeOrder, setActiveOrder } = useOrdersStore();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(activeOrder);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch order detail on mount
  useEffect(() => {
    const loadOrder = async () => {
      if (!id) {
        setError('Order ID not found');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const orderData = await fetchOrderDetail(id);
        setOrder(orderData);
        setActiveOrder(orderData);
        logger.info('Order detail loaded', { orderId: id });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load order';
        setError(message);
        logger.error('Failed to fetch order detail', { id, error: message });
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, fetchOrderDetail, setActiveOrder]);

  const handleAccept = useCallback(async () => {
    if (!id) return;

    setActionLoading(true);
    try {
      await acceptCurrentOrder(id);
      logger.info('Order accepted, navigating back');
      router.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to accept order';
      setError(message);
      logger.error('Failed to accept order', { id, error: message });
    } finally {
      setActionLoading(false);
    }
  }, [id, acceptCurrentOrder, router]);

  const handleReject = useCallback(async () => {
    if (!id || !rejectReason.trim()) return;

    setActionLoading(true);
    try {
      await rejectCurrentOrder(id, rejectReason);
      logger.info('Order rejected, navigating back');
      setShowRejectModal(false);
      router.back();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reject order';
      setError(message);
      logger.error('Failed to reject order', { id, error: message });
    } finally {
      setActionLoading(false);
    }
  }, [id, rejectReason, rejectCurrentOrder, router]);

  const handleGoToPackingChecklist = useCallback(() => {
    if (!id) return;
    logger.info('Navigating to packing checklist', { orderId: id });
    router.push({
      pathname: '/(tabs)/index',
      params: { orderId: id, openChecklist: 'true' },
    });
  }, [id, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View testID="loading-spinner" style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to Load Order</Text>
          <Text style={styles.errorMessage}>{error || 'Order not found'}</Text>
          <PrimaryButton label="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const canAccept = order.status === OrderStatus.PENDING;
  const canStartPacking = order.status === OrderStatus.ACCEPTED;

  const content = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
        <Text style={styles.timestamp}>{formatDateTime(order.createdAt)}</Text>
      </View>

      {/* Countdown Timer */}
      {canAccept && (
        <View style={styles.timerContainer}>
          <CountdownTimer
            acceptanceDeadline={order.acceptanceDeadline}
            onExpire={() => {
              setError('Order acceptance window has expired');
              logger.warn('Order acceptance window expired', {
                orderId: order.id,
              });
            }}
          />
        </View>
      )}

      {/* Order Items */}
      <OrderItemsPanel items={order.items} />

      {/* Customer Info */}
      <CustomerInfoCard
        customerName={order.customerName}
        customerPhone={order.customerPhone}
        deliveryAddress={order.deliveryAddress}
      />

      {/* Order Status Timeline */}
      <View style={[styles.timelineCard, shadows.sm]}>
        <Text style={styles.timelineTitle}>Order Status</Text>
        <OrderStatusTimeline order={order} />
      </View>

      {/* Total Section */}
      <View style={[styles.totalCard, shadows.sm]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Delivery Fee</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(order.deliveryFee)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.grandTotal}>Total Amount</Text>
          <Text style={styles.grandTotalValue}>
            {formatCurrency(order.total)}
          </Text>
        </View>
        <Text style={styles.paymentMode}>
          Payment: {order.paymentMode === 'upi' ? 'UPI' : 'Cash on Delivery'}
        </Text>
      </View>

      {/* Action Buttons — Accept/Reject for pending orders */}
      {canAccept && (
        <View style={styles.actionsContainer}>
          <PrimaryButton
            label={actionLoading ? 'Processing...' : 'Accept Order'}
            onPress={handleAccept}
            loading={actionLoading}
            disabled={actionLoading}
            size="lg"
          />

          <PrimaryButton
            label={actionLoading ? 'Processing...' : 'Reject Order'}
            onPress={() => setShowRejectModal(true)}
            variant="danger"
            disabled={actionLoading}
            size="lg"
            style={styles.rejectButton}
          />
        </View>
      )}

      {/* Packing Checklist button for accepted orders */}
      {canStartPacking && (
        <View style={styles.actionsContainer}>
          <PrimaryButton
            label="Go to Packing Checklist"
            onPress={handleGoToPackingChecklist}
            size="lg"
          />
        </View>
      )}

      {/* Status display for all other statuses */}
      {!canAccept && !canStartPacking && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Order has been {order.status.replace(/_/g, ' ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ErrorBoundary>{content}</ErrorBoundary>

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Why are you rejecting?</Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Please provide a reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              textAlignVertical="top"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.modalButtons}>
              <PrimaryButton
                label="Cancel"
                onPress={() => setShowRejectModal(false)}
                variant="secondary"
                disabled={actionLoading}
              />
              <PrimaryButton
                label={actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                onPress={handleReject}
                variant="danger"
                loading={actionLoading}
                disabled={actionLoading || !rejectReason.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingVertical: spacing.lg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: colors.error,
    marginBottom: spacing.md,
  },

  errorMessage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  header: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },

  orderId: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  timestamp: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  timerContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },

  timelineTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },

  totalLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  totalValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  grandTotal: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  grandTotalValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  paymentMode: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  actionsContainer: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.lg,
    gap: spacing.md,
  },

  rejectButton: {
    marginTop: spacing.md,
  },

  statusContainer: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },

  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },

  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  reasonInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    minHeight: 100,
    marginBottom: spacing.lg,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
