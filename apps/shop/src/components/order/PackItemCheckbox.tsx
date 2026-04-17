/**
 * PackItemCheckbox — Single pack item with checkbox and details
 * Shows name, quantity, price with strikethrough when checked
 * Used in packing checklist
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrderItem } from '@/types/orders';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';

interface Props {
  item: OrderItem;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function PackItemCheckbox({ item, checked, onChange }: Props) {
  const priceRupees = (item.price / 100).toFixed(2);

  return (
    <TouchableOpacity
      style={[styles.container, checked && styles.containerChecked]}
      onPress={() => onChange(!checked)}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <View style={styles.checkbox}>
        {checked ? (
          <MaterialCommunityIcons
            name="checkbox-marked"
            size={24}
            color={colors.success}
          />
        ) : (
          <MaterialCommunityIcons
            name="checkbox-blank-outline"
            size={24}
            color={colors.textTertiary}
          />
        )}
      </View>

      {/* Item Details */}
      <View style={styles.content}>
        <Text
          style={[
            styles.productName,
            checked && styles.productNameChecked,
          ]}
          numberOfLines={2}
        >
          {item.productName}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
          </View>

          <Text
            style={[
              styles.price,
              checked && styles.priceChecked,
            ]}
          >
            ₹{priceRupees}
          </Text>
        </View>
      </View>

      {/* Status icon */}
      {checked && (
        <View style={styles.statusIcon}>
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={colors.success}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },

  containerChecked: {
    backgroundColor: `${colors.success}10`,
  },

  checkbox: {
    marginRight: spacing.md,
  },

  content: {
    flex: 1,
  },

  productName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  productNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  qtyBadge: {
    backgroundColor: `${colors.info}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },

  qtyText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: colors.info,
  },

  price: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  priceChecked: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },

  statusIcon: {
    marginLeft: spacing.md,
  },
});
