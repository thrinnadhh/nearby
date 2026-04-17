/**
 * StockBadge Component — displays product stock status
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';

interface Props {
  stockQty: number;
  threshold?: number; // default 5
  testID?: string;
}

export const StockBadge = React.memo(function StockBadge({
  stockQty,
  threshold = 5,
  testID = 'stock-badge',
}: Props) {
  const { status, displayText, bgColor, textColor, iconColor } = useMemo(() => {
    if (stockQty === 0) {
      return {
        status: 'out-of-stock',
        displayText: 'Out of Stock',
        bgColor: colors.error,
        textColor: colors.white,
        iconColor: colors.white,
      };
    }

    if (stockQty <= threshold) {
      return {
        status: 'low-stock',
        displayText: `Low Stock (${stockQty})`,
        bgColor: colors.warning,
        textColor: colors.textPrimary,
        iconColor: colors.textPrimary,
      };
    }

    return {
      status: 'in-stock',
      displayText: `In Stock (${stockQty})`,
      bgColor: colors.success,
      textColor: colors.white,
      iconColor: colors.white,
    };
  }, [stockQty, threshold]);

  const iconName =
    status === 'out-of-stock'
      ? 'package-remove'
      : status === 'low-stock'
        ? 'package-down'
        : 'package-check';

  return (
    <View
      style={[styles.badge, { backgroundColor: bgColor }]}
      testID={testID}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={14}
        color={iconColor}
        style={styles.icon}
      />
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {displayText}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  icon: {
    marginRight: 2,
  },
  text: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
});
