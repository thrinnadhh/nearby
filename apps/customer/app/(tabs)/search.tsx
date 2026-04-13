import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/location';
import { CategoryChip, CATEGORY_LABELS } from '@/components/CategoryChip';
import { ProductCard } from '@/components/ProductCard';
import { searchProducts } from '@/services/search';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product, ShopCategory } from '@/types';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ShopCategory[];
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 100;

type ProductWithShop = Product & { shop_name: string };

export default function SearchScreen() {
  const token = useAuthStore((s) => s.token) ?? undefined;
  const { coords } = useLocationStore();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | null>(null);
  const [results, setResults] = useState<ProductWithShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);

  // ── Run search when debounced query or category changes ─────────────────
  const runSearch = useCallback(async () => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const res = await searchProducts(
        {
          q: debouncedQuery,
          lat: coords?.lat,
          lng: coords?.lng,
          category: selectedCategory ?? undefined,
          limit: 30,
        },
        token
      );
      setResults(res.data);
    } catch {
      setSearchError('Search failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedCategory, coords, token]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  function handleClear() {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
    inputRef.current?.focus();
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const showPrompt = debouncedQuery.length < MIN_QUERY_LENGTH && !hasSearched;
  const showEmpty = hasSearched && !loading && !searchError && results.length === 0;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>Search</Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search products…"
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {/* All chip */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setSelectedCategory(null)}
          style={[styles.allChip, selectedCategory === null && styles.allChipSelected]}
        >
          <Text style={[styles.allChipLabel, selectedCategory === null && styles.allChipLabelSelected]}>
            All
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

      {/* Body */}
      {loading ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchError ? (
        <View style={styles.centerFlex}>
          <Text style={styles.errorText}>{searchError}</Text>
          <TouchableOpacity onPress={runSearch} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : showPrompt ? (
        <View style={styles.centerFlex}>
          <Text style={styles.promptIcon}>🔍</Text>
          <Text style={styles.promptTitle}>Find any product</Text>
          <Text style={styles.promptSubtitle}>
            Type at least {MIN_QUERY_LENGTH} characters to search across all shops near you.
          </Text>
        </View>
      ) : showEmpty ? (
        <View style={styles.centerFlex}>
          <Text style={styles.promptIcon}>😕</Text>
          <Text style={styles.promptTitle}>No products found</Text>
          <Text style={styles.promptSubtitle}>
            Try a different keyword or category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              shopId={item.shop_id}
              onPress={() => {
                // Navigate to shop profile — Sprint 8
              }}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultCount}>
                {results.length} result{results.length !== 1 ? 's' : ''} for "{debouncedQuery}"
              </Text>
            ) : null
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
    gap: spacing.md,
  },
  brand: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    padding: 0,
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

  // ── Result list ─────────────────────────────────────────────────────────
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },
  resultCount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // ── States ──────────────────────────────────────────────────────────────
  centerFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  promptIcon: { fontSize: 48 },
  promptTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  promptSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
});
