/**
 * OrderItemsPanel Component — displays items breakdown with quantities and prices
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { OrderItem } from '@/types/orders';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  items: OrderItem[];
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
      </View>
      <Text style={styles.itemPrice}>
        {formatCurrency(item.subtotal)}
      </Text>
    </View>
  );
}

export function OrderItemsPanel({ items }: Props) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.title}>Order Items</Text>

      <View style={styles.divider} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <ItemRow item={item} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total Items:</Text>
          <Text style={styles.footerLabel}>Subtotal:</Text>
        </View>
        <View style={styles.footerValues}>
          <Text style={styles.footerValue}>{totalItems}</Text>
          <Text style={styles.footerValue}>{formatCurrency(subtotal)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },

  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },

  itemDetails: {
    flex: 1,
    marginRight: spacing.md,
  },

  itemName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  itemQty: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  itemPrice: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  separator: {
    height: 1,
    backgroundColor: colors.surfaceSecondary,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },

  footerLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  footerValues: {
    alignItems: 'flex-end',
  },

  footerValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});
