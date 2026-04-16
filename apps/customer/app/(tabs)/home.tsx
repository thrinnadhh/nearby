import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/location';
import { useShopsStore } from '@/store/shops';
import { useLocation } from '@/hooks/useLocation';
import { CategoryChip, CATEGORY_LABELS } from '@/components/CategoryChip';
import { ShopCard } from '@/components/ShopCard';
import { searchNearbyShops } from '@/services/search';
import { onShopStatusChange } from '@/services/socket';
import type { Shop, ShopCategory } from '@/types';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ShopCategory[];

export default function HomeScreen() {
  const token = useAuthStore((s) => s.token) ?? undefined;
  const { coords, address } = useLocationStore();
  const { requesting, requestLocation } = useLocation();
  const setShopStatus = useShopsStore((s) => s.setShopStatus);

  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | null>(
    null
  );
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── Fetch shops whenever location or category changes ───────────────────
  const fetchShops = useCallback(async () => {
    if (!coords) return;
    setLoadingShops(true);
    setSearchError(null);
    try {
      const result = await searchNearbyShops(
        {
          lat: coords.lat,
          lng: coords.lng,
          category: selectedCategory ?? undefined,
          limit: 20,
        },
        token
      );
      setShops(result.data);
    } catch {
      setSearchError('Could not load shops. Check your connection.');
    } finally {
      setLoadingShops(false);
    }
  }, [coords, selectedCategory, token]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // ── Listen for real-time shop status changes ─────────────────────────────
  useEffect(() => {
    const unsubscribe = onShopStatusChange(({ shopId, isOpen }) => {
      // Update the store for other screens to consume
      setShopStatus(shopId, isOpen);
      
      // Update local shops list to reflect status change immediately
      setShops((prev) =>
        prev.map((shop) =>
          shop.id === shopId ? { ...shop, is_open: isOpen } : shop
        )
      );
    });

    return () => unsubscribe();
  }, [setShopStatus]);

  // ── Location not granted yet ─────────────────────────────────────────────
  if (!coords) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationTitle}>Allow location access</Text>
        <Text style={styles.locationSubtitle}>
          NearBy needs your location to show shops near you.
        </Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={requestLocation}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.locationButtonText}>Allow Location</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.brand}>NearBy</Text>
        </View>
        <TouchableOpacity
          style={styles.locationRow}
          onPress={requestLocation}
          disabled={requesting}
        >
          <Text style={styles.locationPin}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {address ?? 'Detecting location…'}
          </Text>
          <Text style={styles.locationChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {/* "All" chip */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setSelectedCategory(null)}
          style={[styles.allChip, selectedCategory === null && styles.allChipSelected]}
        >
          <Text
            style={[
              styles.allChipLabel,
              selectedCategory === null && styles.allChipLabelSelected,
            ]}
          >
            🏪 All
          </Text>
        </TouchableOpacity>

        {ALL_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            category={cat}
            selected={selectedCategory === cat}
            onPress={setSelectedCategory}
          />
        ))}
      </ScrollView>

      {/* Shop list */}
      {loadingShops ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchError ? (
        <View style={styles.centerFlex}>
          <Text style={styles.errorText}>{searchError}</Text>
          <TouchableOpacity onPress={fetchShops} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <ShopCard
              shop={item}
              onPress={(shop) => router.push(`/(tabs)/shop/${shop.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerFlex}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No shops found nearby</Text>
              <Text style={styles.emptySubtitle}>
                Try a different category or expand your area.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationPin: { fontSize: 14 },
  locationText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  locationChevron: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },

  // ── Category chips ───────────────────────────────────────────────────────
  chipsScroll: { flexGrow: 0 },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  allChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  allChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  allChipLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  allChipLabelSelected: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },

  // ── Shop list ────────────────────────────────────────────────────────────
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },

  // ── Location prompt ──────────────────────────────────────────────────────
  centerScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  locationIcon: { fontSize: 56 },
  locationTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  locationSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationButton: {
    height: 52,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minWidth: 180,
  },
  locationButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },

  // ── Shared states ────────────────────────────────────────────────────────
  centerFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
