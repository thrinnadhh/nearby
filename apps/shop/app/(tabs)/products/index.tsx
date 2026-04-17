/**
 * Product Catalogue Screen — displays shop's products with search and category filters
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useProducts } from '@/hooks/useProducts';
import { useProductsStore } from '@/store/products';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useFCM } from '@/hooks/useFCM';
import logger from '@/utils/logger';

export default function ProductCatalogueScreen() {
  const router = useRouter();
  const {
    products,
    loading,
    error,
    fetchProducts,
    deleteProduct,
    retry,
  } = useProducts();
  const {
    searchQuery,
    activeCategory,
    setSearchQuery,
    setActiveCategory,
    filteredProducts,
    getUniqueCategories,
  } = useProductsStore();
  const { registerFCMToken } = useFCM();

  // For search debounce
  const [localSearchText, setLocalSearchText] = useState(searchQuery);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Register FCM token on mount
  useEffect(() => {
    const registerToken = async () => {
      const token = await registerFCMToken();
      if (token) {
        logger.info('FCM token registered for products');
      }
    };
    registerToken();
  }, [registerFCMToken]);

  // Fetch products on screen focus
  useFocusEffect(
    useCallback(() => {
      if (products.length === 0 && !loading) {
        fetchProducts();
      }
    }, [products.length, loading, fetchProducts])
  );

  // Debounced search handler (100ms)
  const handleSearchChange = useCallback((text: string) => {
    setLocalSearchText(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(text);
      logger.info('Search query updated', { query: text });
    }, 100);
  }, [setSearchQuery]);

  const handleClearSearch = useCallback(() => {
    setLocalSearchText('');
    setSearchQuery('');
    logger.info('Search query cleared');
  }, [setSearchQuery]);

  const handleCategorySelect = useCallback(
    (category: string) => {
      setActiveCategory(category);
      logger.info('Category selected', { category });
    },
    [setActiveCategory]
  );

  const handleProductPress = useCallback(
    (productId: string) => {
      logger.info('Product pressed', { productId });
      router.push({
        pathname: '(tabs)/products/[id]',
        params: { id: productId },
      });
    },
    [router]
  );

  const handleDeleteProduct = useCallback(
    async (productId: string) => {
      try {
        await deleteProduct(productId);
        logger.info('Product deleted via UI', { productId });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete product';
        logger.error('Failed to delete product', { productId, error: errorMsg });
      }
    },
    [deleteProduct]
  );

  // Get unique categories from products
  const categories = useMemo(() => {
    const unique = getUniqueCategories();
    return ['All', ...unique];
  }, [getUniqueCategories]);

  // Get filtered products
  const displayedProducts = useMemo(() => {
    return filteredProducts();
  }, [filteredProducts]);

  const handleRefresh = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Products</Text>
          <Text style={styles.headerSubtitle}>
            {displayedProducts.length} of {products.length} products
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={[styles.searchInput, shadows.sm]}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.searchInputField}
              placeholder="Search products..."
              placeholderTextColor={colors.textTertiary}
              value={localSearchText}
              onChangeText={handleSearchChange}
              testID="product-search-input"
            />
            {localSearchText.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                testID="product-search-clear"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
          testID="product-category-tabs"
        >
          {categories.map((category) => {
            const isActive = activeCategory === (category === 'All' ? 'all' : category);
            const categoryKey = category === 'All' ? 'all' : category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  isActive && styles.categoryTabActive,
                ]}
                onPress={() => handleCategorySelect(categoryKey)}
                testID={`category-tab-${categoryKey}`}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    isActive && styles.categoryTabTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Products Grid */}
        <ProductGrid
          products={displayedProducts}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
          onProductPress={handleProductPress}
          onDeletePress={handleDeleteProduct}
          testID="product-catalogue-grid"
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInputField: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  categoriesContainer: {
    maxHeight: 50,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  categoryTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  categoryTabTextActive: {
    color: colors.textInverse,
  },
});
