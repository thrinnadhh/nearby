import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
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
import { useCartStore, selectCartTotal } from '@/store/cart';
import { useLocationStore } from '@/store/location';
import { searchProducts } from '@/services/search';
import type { CartItem } from '@/types';

const DELIVERY_FEE_PAISE = 2500; // ₹25 flat — dynamic fee in Sprint 9

// ─── Currency helper ─────────────────────────────────────────────────────────

function paise(amount: number) {
  return `₹${(amount / 100).toFixed(2)}`;
}

// ─── Cart item row ───────────────────────────────────────────────────────────

interface CartRowProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

function CartRow({ item, onIncrement, onDecrement, onRemove }: CartRowProps) {
  const { product, qty } = item;
  return (
    <View style={styles.row}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbEmoji}>📦</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.rowPrice}>{paise(product.price)} each</Text>
      </View>

      {/* Controls */}
      <View style={styles.rowControls}>
        <TouchableOpacity
          onPress={onDecrement}
          style={styles.stepBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={qty === 1 ? 'trash-outline' : 'remove'}
            size={16}
            color={qty === 1 ? colors.error : colors.primary}
          />
        </TouchableOpacity>

        <Text style={styles.qtyText}>{qty}</Text>

        <TouchableOpacity
          onPress={onIncrement}
          style={styles.stepBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Cart screen ─────────────────────────────────────────────────────────────

export default function CartScreen() {
  const token = useAuthStore((s) => s.token) ?? undefined;
  const deliveryAddress = useLocationStore((s) => s.deliveryAddress);
  const {
    entries,
    items,
    shopId: cartShopId,
    enrichItems,
    updateQty,
    removeItem,
    clearCart,
  } = useCartStore();
  const subtotal = useCartStore(selectCartTotal);

  // FIX: initialise to true when a restart scenario is detected so the first
  // render shows the spinner rather than a blank list with ₹0 subtotal.
  const [enriching, setEnriching] = useState(entries.length > 0 && items.length === 0);
  const [enrichError, setEnrichError] = useState(false);

  // ── Re-enrich items after app restart (entries persisted, items cleared) ────
  const doEnrich = useCallback(async () => {
    if (!cartShopId || !token) return;
    setEnriching(true);
    setEnrichError(false);
    try {
      const { data } = await searchProducts({ q: '', shopId: cartShopId, limit: 50 }, token);
      enrichItems(data);
    } catch {
      setEnrichError(true);
    } finally {
      setEnriching(false);
    }
  }, [cartShopId, token, enrichItems]);

  useEffect(() => {
    // Only fetch if entries exist but items are empty (app restart scenario)
    if (entries.length > 0 && items.length === 0) {
      doEnrich();
    }
  }, [entries.length, items.length, doEnrich]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleDecrement(productId: string, currentQty: number) {
    if (currentQty === 1) {
      Alert.alert('Remove item?', 'Remove this item from your cart?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeItem(productId) },
      ]);
    } else {
      updateQty(productId, currentQty - 1);
    }
  }

  function handleClearCart() {
    Alert.alert('Clear cart?', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  }

  function handleProceed() {
    if (!deliveryAddress) {
      router.push('/address-picker');
      return;
    }
    // Sprint 9.1: Navigate to checkout screen
    router.push('/(tabs)/checkout');
  }

  // ── Empty cart ────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse nearby shops and add items to get started.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.browseBtnText}>Browse shops</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading / error while enriching after restart ─────────────────────────
  if (enriching) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your cart…</Text>
        </View>
      </View>
    );
  }

  if (enrichError) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Unable to load cart. Check your connection.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={doEnrich}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const total = subtotal + DELIVERY_FEE_PAISE;
  const totalQty = entries.reduce((s, e) => s + e.qty, 0);

  // ── Main cart ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Cart ({totalQty} {totalQty === 1 ? 'item' : 'items'})
        </Text>
        <TouchableOpacity onPress={handleClearCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        renderItem={({ item }) => (
          <CartRow
            item={item}
            onIncrement={() => updateQty(item.product.id, item.qty + 1)}
            onDecrement={() => handleDecrement(item.product.id, item.qty)}
            onRemove={() => removeItem(item.product.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.summary}>
            {/* Delivery address row */}
            <TouchableOpacity style={styles.addressRow} onPress={() => router.push('/address-picker')}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={styles.addressText} numberOfLines={1}>
                {deliveryAddress ?? 'Set delivery address'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Price breakdown */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{paise(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery fee</Text>
                <Text style={styles.summaryValue}>{paise(DELIVERY_FEE_PAISE)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{paise(total)}</Text>
              </View>
            </View>

            {/* CTA — disabled until a delivery address is confirmed */}
            <TouchableOpacity
              style={[styles.proceedBtn, !deliveryAddress && styles.proceedBtnDisabled]}
              disabled={!deliveryAddress}
              onPress={handleProceed}
            >
              <Text style={styles.proceedText}>
                {deliveryAddress ? 'Proceed to checkout' : 'Set delivery address first'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  clearText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.error,
  },

  // ── Item list ──────────────────────────────────────────────────────────────
  list: {
    paddingBottom: spacing.massive,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: { fontSize: 28 },
  rowInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  rowName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  rowPrice: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },

  // ── Summary + footer ───────────────────────────────────────────────────────
  summary: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  proceedBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  proceedBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  proceedText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },

  // ── Empty / loading / error ────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
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
  browseBtn: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  browseBtnText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
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
