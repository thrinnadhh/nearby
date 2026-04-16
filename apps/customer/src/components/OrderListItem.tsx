import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import type { Order, OrderStatus } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Waiting for shop',
    accepted: 'Shop accepted',
    packing: 'Being packed',
    ready: 'Ready for pickup',
    assigned: 'Assigned to partner',
    picked_up: 'Picked up',
    out_for_delivery: 'On the way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return colors.success;
    case 'cancelled':
      return colors.error;
    case 'pending':
    case 'packing':
      return colors.warning;
    case 'accepted':
    case 'ready':
      return colors.primary;
    case 'assigned':
    case 'picked_up':
    case 'out_for_delivery':
      return '#8b5cf6';
    default:
      return colors.textSecondary;
  }
}

export function getStatusIcon(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'checkmark-circle';
    case 'cancelled':
      return 'close-circle';
    case 'pending':
      return 'time';
    case 'accepted':
      return 'thumbs-up';
    case 'packing':
      return 'cube';
    case 'ready':
      return 'checkmark';
    case 'assigned':
    case 'picked_up':
      return 'car';
    case 'out_for_delivery':
      return 'car';
    default:
      return 'ellipsis-horizontal';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OrderListItemProps {
  order: Order;
  onPress: (order: Order) => void;
  onReorder?: (order: Order) => Promise<void>;
  isReordering?: boolean;
}

export function OrderListItem({
  order,
  onPress,
  onReorder,
  isReordering,
}: OrderListItemProps) {
  const priceRupees = (order.total_paise / 100).toFixed(2);
  const createdDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });

  const canReorder = order.status === 'delivered';
  const statusColor = getStatusColor(order.status);

  const handleReorderPress = async () => {
    if (!onReorder) return;

    try {
      await onReorder(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder';
      Alert.alert('Reorder Failed', message);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(order)}
      activeOpacity={0.7}
    >
      {/* Header: Order ID and Amount */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{createdDate}</Text>
        </View>
        <Text style={styles.orderAmount}>₹{priceRupees}</Text>
      </View>

      {/* Shop and Items */}
      <View style={styles.infoSection}>
        <Text style={styles.shopName} numberOfLines={1}>
          {order.shop_name}
        </Text>
        <Text style={styles.itemCount}>
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
        <Ionicons name={getStatusIcon(order.status)} size={14} color={statusColor} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {getStatusLabel(order.status)}
        </Text>
      </View>

      {/* Reorder Button */}
      {canReorder && onReorder && (
        <TouchableOpacity
          style={[styles.reorderButton, isReordering && styles.reorderButtonDisabled]}
          onPress={handleReorderPress}
          disabled={isReordering}
        >
          {isReordering ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <>
              <Ionicons name="refresh" size={14} color={colors.success} />
              <Text style={styles.reorderText}>Reorder</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },

  headerLeft: {
    flex: 1,
  },

  orderId: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
  },

  orderDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  orderAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.bold,
  },

  infoSection: {
    marginBottom: spacing.md,
  },

  shopName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontFamily.semiBold,
  },

  itemCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },

  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },

  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: '#f0fdf420',
  },

  reorderButtonDisabled: {
    opacity: 0.6,
  },

  reorderText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.success,
    fontFamily: fontFamily.semiBold,
  },
});
