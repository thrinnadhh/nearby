/**
 * Packing Checklist Screen (Task 11.8)
 * Modal/Screen showing order items with checkboxes
 * Mark items as packed with individual checkboxes
 * "Mark All Ready" button triggers PATCH /orders/:id/ready
 * On success: show toast + return to orders list
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useOrders } from '@/hooks/useOrders';
import { PackChecklistHeader } from '@/components/order/PackChecklistHeader';
import { PackItemCheckbox } from '@/components/order/PackItemCheckbox';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AppError } from '@/types/common';
import { Order, OrderItem } from '@/types/orders';
import logger from '@/utils/logger';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PackChecklistScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const { orders, markOrderReady, loading, error } = useOrders();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Find the current order
  const order = orders.find((o) => o.id === orderId);

  // Initialize checked items from form state (if user was mid-checklist)
  useEffect(() => {
    if (order && order.items) {
      // Initialize with empty set (all unchecked)
      setCheckedItems(new Set());
    }
  }, [order]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={56}
          color={colors.error}
        />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorMessage}>
          This order was not found. It may have been cancelled or removed.
        </Text>
        <PrimaryButton
          label="Go Back"
          onPress={() => router.back()}
          size="lg"
          style={styles.errorButton}
        />
      </View>
    );
  }

  const readyCount = checkedItems.size;
  const totalCount = order.items.length;
  const allMarkedReady = readyCount === totalCount;

  const handleToggleItem = useCallback(
    (itemId: string) => {
      setCheckedItems((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });
    },
    []
  );

  const handleMarkAllReady = useCallback(async () => {
    if (!allMarkedReady) {
      setSubmitError('Please mark all items as packed before submitting');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      logger.info('Marking order as ready', {
        orderId: order.id,
        itemCount: totalCount,
      });

      // Call API to mark order ready
      await markOrderReady(order.id);

      logger.info('Order marked as ready', { orderId: order.id });

      // Show success and go back
      // In a real app, you'd show a toast notification here
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Failed to mark order ready';

      setSubmitError(message);
      logger.error('Failed to mark order ready', {
        error: message,
        orderId: order.id,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [allMarkedReady, order.id, totalCount, markOrderReady, router]);

  const handleMarkAllChecked = useCallback(() => {
    if (allMarkedReady) {
      // Uncheck all
      setCheckedItems(new Set());
    } else {
      // Check all
      const allIds = new Set(order.items.map((item) => item.productId));
      setCheckedItems(allIds);
    }
  }, [allMarkedReady, order.items]);

  return (
    <View style={styles.container}>
      {!isConnected && <OfflineBanner />}

      <PackChecklistHeader
        order={order}
        readyCount={readyCount}
        totalCount={totalCount}
      />

      {/* Error message */}
      {(error || submitError) && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={16}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error || submitError}</Text>
        </View>
      )}

      {/* Items List */}
      <FlatList
        data={order.items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => (
          <PackItemCheckbox
            item={item}
            checked={checkedItems.has(item.productId)}
            onChange={() => handleToggleItem(item.productId)}
          />
        )}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="package-variant"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyText}>No items in this order</Text>
          </View>
        }
      />

      {/* Footer Actions */}
      <View style={styles.footer}>
        {/* Select All / Unselect All Button */}
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={handleMarkAllChecked}
          disabled={isSubmitting}
        >
          <MaterialCommunityIcons
            name={allMarkedReady ? 'checkbox-multiple-marked' : 'checkbox-multiple-blank'}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.selectAllText}>
            {allMarkedReady ? 'Uncheck All' : 'Check All'}
          </Text>
        </TouchableOpacity>

        {/* Mark Ready Button */}
        <PrimaryButton
          label={isSubmitting ? 'Submitting...' : 'Mark All Ready'}
          onPress={handleMarkAllReady}
          loading={isSubmitting}
          disabled={isSubmitting || !allMarkedReady || !isConnected}
          size="lg"
          style={styles.submitButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
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

  errorBox: {
    flexDirection: 'row',
    backgroundColor: `${colors.error}15`,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },

  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginLeft: spacing.md,
    flex: 1,
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },

  emptyText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },

  selectAllText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.primary,
    marginLeft: spacing.md,
  },

  submitButton: {
    // Button takes full width
  },
});
