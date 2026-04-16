/**
 * OrderCard Component — displays order summary in list
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
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
import { formatCurrency, formatTime } from '@/utils/formatters';

interface Props {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, shadows.sm]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
          <Text style={styles.time}>{formatTime(order.createdAt)}</Text>
        </View>

        <View style={styles.priceTag}>
          <Text style={styles.price}>{formatCurrency(order.total)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        <View style={styles.customerInfo}>
          <MaterialCommunityIcons
            name="account-outline"
            size={16}
            color={colors.textSecondary}
          />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName} numberOfLines={1}>
              {order.customerName}
            </Text>
            <Text style={styles.customerPhone}>{order.customerPhone}</Text>
          </View>
        </View>

        <View style={styles.itemsInfo}>
          <MaterialCommunityIcons
            name="package-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.itemsCount}>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.addressInfo}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.address} numberOfLines={2}>
            {order.deliveryAddress}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons
            name={order.status === 'pending' ? 'clock-outline' : 'check-circle'}
            size={14}
            color={order.status === 'pending' ? colors.warning : colors.success}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: order.status === 'pending' ? colors.warning : colors.success,
              },
            ]}
          >
            {order.status === 'pending' ? 'Pending' : 'Accepted'}
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  headerLeft: {
    flex: 1,
  },

  orderId: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  time: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  priceTag: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  price: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  customerInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  customerDetails: {
    flex: 1,
    justifyContent: 'center',
  },

  customerName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  customerPhone: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  itemsInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },

  itemsCount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  addressInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  address: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
});
