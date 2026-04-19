/**
 * LowStockAlertItem — displays a single low stock product alert
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  GestureResponderEvent,
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
import { LowStockProduct } from '@/types/low-stock';

interface LowStockAlertItemProps {
  product: LowStockProduct;
  isDismissed?: boolean;
  onDismiss?: (productId: string) => void;
  onUndismiss?: (productId: string) => void;
  onPress?: () => void;
}

export const LowStockAlertItem: React.FC<LowStockAlertItemProps> = ({
  product,
  isDismissed = false,
  onDismiss,
  onUndismiss,
  onPress,
}) => {
  const handleDismiss = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      onDismiss?.(product.id);
    },
    [product.id, onDismiss]
  );

  const handleUndismiss = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      onUndismiss?.(product.id);
    },
    [product.id, onUndismiss]
  );

  // Format price as rupees
  const priceInRupees = (product.price / 100).toFixed(2);

  // Determine stock status color
  const getStockStatusColor = () => {
    if (product.stockQuantity === 0) {
      return colors.error;
    }
    if (product.stockQuantity <= 3) {
      return colors.warning;
    }
    return colors.warning;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isDismissed && styles.containerDismissed,
        shadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Product Image */}
      {product.thumbnailUrl && (
        <Image
          source={{ uri: product.thumbnailUrl }}
          style={styles.image}
        />
      )}
      {!product.thumbnailUrl && (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <MaterialCommunityIcons
            name="image-off"
            size={24}
            color={colors.textTertiary}
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header: Name + Category */}
        <View style={styles.header}>
          <Text style={[styles.name, isDismissed && styles.textDismissed]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[styles.category, isDismissed && styles.textDismissed]}>
            {product.category}
          </Text>
        </View>

        {/* Description */}
        {product.description && (
          <Text
            style={[styles.description, isDismissed && styles.textDismissed]}
            numberOfLines={2}
          >
            {product.description}
          </Text>
        )}

        {/* Stock Info */}
        <View style={styles.stockInfo}>
          <View style={[styles.stockBadge, { backgroundColor: getStockStatusColor() }]}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={16}
              color={colors.white}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={styles.stockBadgeText}>
              {product.stockQuantity} {product.unit}
            </Text>
          </View>

          <Text style={[styles.price, isDismissed && styles.textDismissed]}>
            ₹{priceInRupees}
          </Text>
        </View>

        {/* Updated At */}
        <Text style={[styles.updatedAt, isDismissed && styles.textDismissed]}>
          Last updated: {new Date(product.updatedAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isDismissed && onDismiss && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dismissButton]}
            onPress={handleDismiss}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        )}

        {isDismissed && onUndismiss && (
          <TouchableOpacity
            style={[styles.actionButton, styles.undismissButton]}
            onPress={handleUndismiss}
          >
            <MaterialCommunityIcons
              name="reload"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        )}

        {product.isAvailable && (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={colors.success}
            style={styles.availabilityIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  containerDismissed: {
    opacity: 0.6,
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  category: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stockBadgeText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.white,
  },
  price: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  updatedAt: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: colors.error,
  },
  undismissButton: {
    backgroundColor: colors.warning,
  },
  availabilityIcon: {
    marginLeft: spacing.sm,
  },
  textDismissed: {
    color: colors.textSecondary,
  },
});
