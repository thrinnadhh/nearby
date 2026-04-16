import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { paise } from '@/utils/currency';
import type { OrderItem } from '@/types';

/**
 * OrderItemsPanel Component (Task 10.2)
 * 
 * Displays itemized product breakdown for an order
 */

interface OrderItemsPanelProps {
  items: OrderItem[];
}

export function OrderItemsPanel({ items }: OrderItemsPanelProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerCol1}>Item</Text>
        <Text style={styles.headerCol2}>Qty</Text>
        <Text style={styles.headerCol3}>Price</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Items */}
      {items.map((item, index) => (
        <View key={`${item.product_id}-${index}`}>
          <View style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemQty}>×{item.qty}</Text>
            <Text style={styles.itemPrice}>{paise(item.price * item.qty)}</Text>
          </View>
        </View>
      ))}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Subtotal */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>{paise(subtotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  headerRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },

  headerCol1: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamily.semiBold,
  },

  headerCol2: {
    width: 40,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fontFamily.semiBold,
  },

  headerCol3: {
    width: 60,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'right',
    fontFamily: fontFamily.semiBold,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  itemName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    marginRight: spacing.sm,
  },

  itemQty: {
    width: 40,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },

  itemPrice: {
    width: 60,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    fontFamily: fontFamily.semiBold,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },

  summaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontFamily.semiBold,
  },

  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamily.bold,
  },
});
