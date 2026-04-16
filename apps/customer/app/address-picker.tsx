import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
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
import { useLocation } from '@/hooks/useLocation';
import { useDebounce } from '@/hooks/useDebounce';
import { autocompleteAddress } from '@/services/location';
import type { AddressSuggestion } from '@/types';

export default function AddressPickerScreen() {
  const token = useAuthStore((s) => s.token) ?? undefined;
  const { address, coords, deliveryAddress, deliveryCoords, setDeliveryAddress } =
    useLocationStore();
  const { requesting, requestLocation } = useLocation();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected address pending confirmation (null = use current delivery address)
  const [pending, setPending] = useState<{ address: string; lat: number; lng: number } | null>(
    null
  );

  const debouncedQuery = useDebounce(query, 400);

  // ── Autocomplete fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    autocompleteAddress(debouncedQuery, token)
      .then((results) => {
        if (!cancelled) setSuggestions(results);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, token]);

  // ── Use GPS ───────────────────────────────────────────────────────────────
  const handleUseGPS = useCallback(async () => {
    const ok = await requestLocation();
    if (ok) {
      // requestLocation updates locationStore; read the fresh values via selector
      // We trigger a re-render by clearing pending
      setPending(null);
      setQuery('');
    }
  }, [requestLocation]);

  // ── Confirm selection ─────────────────────────────────────────────────────
  function handleConfirm() {
    if (pending) {
      setDeliveryAddress(pending.address, { lat: pending.lat, lng: pending.lng });
    } else if (coords && address) {
      setDeliveryAddress(address, coords);
    }
    router.back();
  }

  // ── Select a suggestion ───────────────────────────────────────────────────
  function handleSelect(s: AddressSuggestion) {
    setPending({ address: s.address, lat: s.lat, lng: s.lng });
    setQuery('');
    setSuggestions([]);
  }

  // Active address shown in the confirmation strip
  const activeAddress = pending?.address ?? deliveryAddress ?? address;
  const hasAddress = Boolean(activeAddress);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery address</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search for area, street, landmark…"
          placeholderTextColor={colors.textDisabled}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSelect(item)}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.suggestionText} numberOfLines={2}>
                {item.address}
              </Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.ruleSeparator} />}
          style={styles.suggestionList}
        />
      )}

      {/* No-results hint */}
      {query.trim().length > 2 && !searching && suggestions.length === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No results found. Try a different search.</Text>
        </View>
      )}

      {/* GPS option */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>OR</Text>
        <TouchableOpacity
          style={styles.gpsBtn}
          onPress={handleUseGPS}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="navigate-outline" size={18} color={colors.primary} />
          )}
          <Text style={styles.gpsBtnText}>
            {requesting ? 'Detecting location…' : 'Use current GPS location'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected address preview */}
      {hasAddress && (
        <View style={styles.previewCard}>
          <View style={styles.previewRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={styles.previewText} numberOfLines={2}>
              {activeAddress}
            </Text>
          </View>
          {pending && (
            <Text style={styles.previewHint}>Tap confirm to use this address</Text>
          )}
        </View>
      )}

      {/* Confirm button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, !hasAddress && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!hasAddress}
        >
          <Text style={styles.confirmText}>Confirm address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },

  // ── Suggestions ───────────────────────────────────────────────────────────
  suggestionList: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 240,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  ruleSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  noResults: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  // ── GPS option ────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  gpsBtnText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },

  // ── Selected preview ──────────────────────────────────────────────────────
  previewCard: {
    margin: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  previewText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  previewHint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.primary,
    paddingLeft: 26,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  confirmText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },
});
