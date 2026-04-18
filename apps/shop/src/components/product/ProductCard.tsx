/**
 * ProductCard Component — grid card for individual product display
 */

import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
import { Product } from '@/types/products';
import { StockBadge } from './StockBadge';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  product: Product;
  onPress: (productId: string) => void;
  onDeletePress: (productId: string) => void;
  testID?: string;
}

export const ProductCard = React.memo(function ProductCard({
  product,
  onPress,
  onDeletePress,
  testID = `product-card-${product.id}`,
}: Props) {
  const router = useRouter();
  const primaryImage = product.images?.find((img) => img.isPrimary);
  const imageUrl = primaryImage?.url || 'https://via.placeholder.com/160x160';

  const handlePress = useCallback(() => {
    onPress(product.id);
  }, [product.id, onPress]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => onDeletePress(product.id),
          style: 'destructive',
        },
      ]
    );
  }, [product.id, product.name, onDeletePress]);

  const handleEditPress = useCallback(() => {
    router.push(`/products/edit/${product.id}`);
  }, [product.id, router]);

  return (
    <TouchableOpacity
      style={[styles.card, shadows.sm]}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={testID}
    >
      {/* Container with fixed height for consistent grid */}
      <View style={styles.cardContent}>
        {/* Product Image */}
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          testID={`product-image-${product.id}`}
          onError={() => {
            // Handle image load errors gracefully
          }}
        />

        {/* Product Details Section */}
        <View style={styles.detailsContainer}>
          {/* Product Name */}
          <Text
            style={styles.productName}
            numberOfLines={2}
            testID={`product-name-${product.id}`}
          >
            {product.name}
          </Text>

          {/* Price */}
          <Text
            style={styles.price}
            testID={`product-price-${product.id}`}
          >
            {formatCurrency(product.price)}
          </Text>

          {/* Stock Badge */}
          <View style={styles.badgeContainer}>
            <StockBadge
              stockQty={product.stockQty}
              threshold={5}
              testID={`stock-badge-${product.id}`}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEditPress}
              testID={`edit-button-${product.id}`}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeletePress}
              testID={`delete-button-${product.id}`}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color={colors.error}
              />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    height: 260, // Fixed height for grid consistency
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  image: {
    height: 120,
    width: '100%',
    backgroundColor: colors.surfaceSecondary,
    resizeMode: 'cover',
  },
  detailsContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'flex-start',
  },
  productName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    height: 36, // Fixed height for 2 lines
  },
  price: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  badgeContainer: {
    marginBottom: spacing.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    borderWidth: 1,
  },
  editButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  deleteButton: {
    borderColor: colors.error,
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
});
