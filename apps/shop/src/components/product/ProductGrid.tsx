/**
 * ProductGrid Component — 2-column FlatList wrapper with loading and error states
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  VirtualizedList,
} from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import { Product } from '@/types/products';
import { ProductCard } from './ProductCard';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import logger from '@/utils/logger';

interface Props {
  products: Product[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onProductPress: (productId: string) => void;
  onDeletePress: (productId: string) => void;
  testID?: string;
}

export const ProductGrid = React.memo(function ProductGrid({
  products,
  loading,
  error,
  onRefresh,
  onProductPress,
  onDeletePress,
  testID = 'product-grid',
}: Props) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      logger.error('Refresh failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={onProductPress}
        onDeletePress={onDeletePress}
      />
    ),
    [onProductPress, onDeletePress]
  );

  const keyExtractor = useCallback((item: Product, index: number) => {
    return item.id || `product-${index}`;
  }, []);

  // Show loading skeleton
  if (loading && products.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]} testID={`${testID}-loading`}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  // Show error state
  if (error && products.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]} testID={`${testID}-error`}>
        <Text style={styles.errorTitle}>Failed to Load Products</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <PrimaryButton
          label="Retry"
          onPress={handleRefresh}
          testID={`${testID}-retry-button`}
        />
      </View>
    );
  }

  // Show empty state when no products
  if (!loading && products.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]} testID={`${testID}-empty`}>
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptyMessage}>
          Add your products to get started
        </Text>
      </View>
    );
  }

  // Render products grid
  return (
    <View style={styles.container} testID={testID}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        scrollIndicatorInsets={{ right: 1 }}
        showsVerticalScrollIndicator={true}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        testID={`${testID}-flatlist`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  columnWrapper: {
    paddingHorizontal: spacing.sm,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
});
