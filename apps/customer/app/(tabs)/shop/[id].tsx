import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useShopsStore } from '@/store/shops';
import { getShop } from '@/services/shops';
import { getShopReviews } from '@/services/reviews';
import { searchProducts } from '@/services/search';
import { onShopStatusChange } from '@/services/socket';
import { ProductCard } from '@/components/ProductCard';
import type { ShopDetail, Review, Product } from '@/types';

// ─── UUID v4 guard — prevents path traversal via crafted route params ─────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trustBadge(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Trusted', color: colors.success };
  if (score >= 60) return { label: 'Good', color: colors.primary };
  if (score >= 40) return { label: 'New', color: colors.warning };
  return { label: 'Review', color: colors.error };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<(Product & { shop_name: string })[]>([]);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];
  const filteredProducts =
    selectedCategory === null
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const hoursLabel =
    shop?.open_time && shop?.close_time
      ? `${shop.open_time} – ${shop.close_time}`
      : 'Hours not set';

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchShop = useCallback(async () => {
    // SECURITY: guard against invalid UUID and unauthenticated calls.
    // _layout.tsx auth guard ensures token is present, but we guard explicitly
    // here as a defense-in-depth measure for any future direct deep-links.
    if (!isValidUUID(id) || !token) return;
    setLoadingShop(true);
    setShopError(null);
    try {
      const data = await getShop(id, token);
      setShop(data);
    } catch {
      // Never expose raw API error messages to the UI — they may leak
      // server internals, hostnames, or stack traces.
      setShopError('Unable to load shop. Please try again.');
    } finally {
      setLoadingShop(false);
    }
  }, [id, token]);

  const fetchReviews = useCallback(async () => {
    if (!isValidUUID(id) || !token) return;
    try {
      const res = await getShopReviews(
        id,
        { limit: 5, sort: 'recent' },
        token
      );
      setReviews(res.data);
    } catch {
      // Reviews are non-critical — fail silently.
    }
  }, [id, token]);

  const fetchProducts = useCallback(async () => {
    if (!isValidUUID(id) || !token) return;
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const res = await searchProducts(
        { shopId: id, q: '', limit: 50 },
        token
      );
      setProducts(res.data);
    } catch {
      // Never expose raw API error messages to the UI.
      setProductsError('Unable to load products. Please try again.');
    } finally {
      setLoadingProducts(false);
    }
  }, [id, token]);

  useEffect(() => {
    void fetchShop();
    void fetchReviews();
    void fetchProducts();
  }, [fetchShop, fetchReviews, fetchProducts]);

  // ── Listen for real-time shop status changes ─────────────────────────────
  useEffect(() => {
    if (!isValidUUID(id)) return;

    const unsubscribe = onShopStatusChange(({ shopId, isOpen }) => {
      if (shopId === id && shop) {
        // Update local shop state to reflect status change
        setShop({ ...shop, is_open: isOpen });
      }
    });

    return () => unsubscribe();
  }, [id, shop]);

  // ── Navigation helper ────────────────────────────────────────────────────

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }

  // ── Guard: invalid id ────────────────────────────────────────────────────

  // SECURITY: reject missing or malformed shop IDs before rendering anything
  if (!isValidUUID(id)) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Invalid shop.</Text>
      </View>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loadingShop) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (shopError !== null || shop === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{shopError ?? 'Shop not found.'}</Text>
        <TouchableOpacity
          onPress={() => void fetchShop()}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = trustBadge(shop.trust_score);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner image */}
      <View style={styles.bannerContainer}>
        {shop.image_url !== null ? (
          <Image
            source={{ uri: shop.image_url }}
            style={styles.banner}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.banner, styles.bannerPlaceholder]} />
        )}
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Shop info card */}
      <View style={styles.infoCard}>
        <View style={styles.nameRow}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <Text style={styles.category}>{shop.category}</Text>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.pill,
              shop.is_open ? styles.pillOpen : styles.pillClosed,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                shop.is_open ? styles.pillOpenText : styles.pillClosedText,
              ]}
            >
              {shop.is_open ? 'Open' : 'Closed'}
            </Text>
          </View>

          {shop.avg_rating !== null && (
            <Text style={styles.rating}>
              {'⭐ '}
              {shop.avg_rating.toFixed(1)}
            </Text>
          )}

          <Text style={styles.hours}>{hoursLabel}</Text>
        </View>

        {shop.description !== null && shop.description.length > 0 ? (
          <Text style={styles.description} numberOfLines={3}>
            {shop.description}
          </Text>
        ) : null}

        {/* Chat button */}
        <TouchableOpacity
          onPress={() => router.push(`/chat/${shop.id}`)}
          style={styles.chatButton}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
          <Text style={styles.chatButtonText}>Message Shop</Text>
        </TouchableOpacity>
      </View>

      {/* Reviews carousel */}
      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <FlatList
            data={reviews}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.reviewList}
            renderItem={({ item }) => (
              <View style={styles.reviewCard}>
                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < item.rating ? 'star' : 'star-outline'}
                      size={14}
                      color={i < item.rating ? '#F59E0B' : colors.border}
                    />
                  ))}
                </View>

                {item.comment !== null && item.comment.length > 0 ? (
                  <Text style={styles.reviewComment} numberOfLines={2}>
                    {item.comment}
                  </Text>
                ) : null}

                <Text style={styles.reviewName}>{item.customer_name}</Text>

                {item.order_id !== null && (
                  <Text style={styles.verifiedBadge}>Verified purchase</Text>
                )}
              </View>
            )}
          />
        </View>
      )}

      {/* Category tabs */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              style={[
                styles.catChip,
                selectedCategory === null && styles.catChipActive,
              ]}
            >
              <Text
                style={[
                  styles.catChipText,
                  selectedCategory === null && styles.catChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.catChip,
                  selectedCategory === cat && styles.catChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    selectedCategory === cat && styles.catChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Product grid */}
      <View style={styles.section}>
        {loadingProducts ? (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: spacing.lg }}
          />
        ) : productsError !== null ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{productsError}</Text>
            <TouchableOpacity
              onPress={() => void fetchProducts()}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>
            {selectedCategory !== null
              ? `No products in "${selectedCategory}"`
              : 'No products listed yet.'}
          </Text>
        ) : (
          // Use a flex-wrap View instead of FlatList to avoid the
          // VirtualizedList-inside-ScrollView warning (scrollEnabled={false}
          // suppresses the crash but not the perf overhead).
          <View style={styles.gridContent}>
            {filteredProducts.map((item) => (
              <View key={item.id} style={styles.gridCell}>
                <ProductCard product={item} shopId={id} />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.massive,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  // ── Banner ───────────────────────────────────────────────────────────────
  bannerContainer: {
    position: 'relative',
  },
  banner: {
    height: 200,
    width: '100%',
  },
  bannerPlaceholder: {
    backgroundColor: colors.primaryLight,
  },
  backBtn: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: borderRadius.full,
  },

  // ── Info card ────────────────────────────────────────────────────────────
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  shopName: {
    flex: 1,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  category: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  pillOpen: {
    backgroundColor: '#D1FAE5',
  },
  pillOpenText: {
    color: '#065F46',
  },
  pillClosed: {
    backgroundColor: '#FEE2E2',
  },
  pillClosedText: {
    color: '#991B1B',
  },
  pillText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  rating: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  hours: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  chatButtonText: {
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  // ── Reviews ──────────────────────────────────────────────────────────────
  reviewList: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  reviewCard: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    lineHeight: 18,
  },
  reviewName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  verifiedBadge: {
    fontSize: fontSize.xs,
    color: '#059669',
    fontFamily: fontFamily.medium,
  },

  // ── Category chips ───────────────────────────────────────────────────────
  categoryRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  catChipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  catChipTextActive: {
    color: colors.primary,
  },

  // ── Product grid ─────────────────────────────────────────────────────────
  // flex-wrap two-column layout — avoids nested VirtualizedList warning.
  // gridRow was the FlatList columnWrapperStyle; no longer needed.
  gridRow: {},
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridCell: {
    // Two columns with a gap: (100% - gap) / 2.
    // Using a fixed percentage keeps columns equal regardless of screen width.
    width: '48%',
  },

  // ── Empty / error states ─────────────────────────────────────────────────
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontFamily: fontFamily.regular,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
});
