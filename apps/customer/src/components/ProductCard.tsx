import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { useCartStore } from '@/store/cart';
import type { Product } from '@/types';

// ─── Category emoji fallback ─────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  kirana: '🛒',
  vegetables: '🥦',
  pharmacy: '💊',
  restaurant: '🍱',
  pet_store: '🐾',
  mobile: '📱',
  furniture: '🛋',
  other: '📦',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product & { shop_name: string };
  shopId: string;
  onPress?: (product: Product) => void;
}

export function ProductCard({ product, shopId, onPress }: ProductCardProps) {
  const { items, addItem, cartShopId } = useCartStore((s) => ({
    items: s.items,
    addItem: s.addItem,
    cartShopId: s.shopId,
  }));

  const cartItem = items.find((i) => i.product.id === product.id);
  const priceRupees = (product.price / 100).toFixed(2);
  const emoji = CATEGORY_EMOJI[product.category] ?? '📦';

  function handleAddToCart() {
    if (cartShopId !== null && cartShopId !== shopId) {
      Alert.alert(
        'Replace cart?',
        'Your cart has items from another shop. Start a new cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start new cart',
            style: 'destructive',
            onPress: () => addItem(product, shopId),
          },
        ]
      );
      return;
    }
    addItem(product, shopId);
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(product)}
      style={styles.card}
    >
      {/* Product image / placeholder */}
      <View style={styles.imageContainer}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>{emoji}</Text>
          </View>
        )}
        {/* Availability tag */}
        {!product.is_available && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Out of stock</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.shopName} numberOfLines={1}>
          {product.shop_name}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>₹{priceRupees}</Text>
          {product.is_available ? (
            <TouchableOpacity
              style={[styles.addBtn, cartItem && styles.addBtnActive]}
              onPress={handleAddToCart}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.addBtnText, cartItem && styles.addBtnTextActive]}>
                {cartItem ? `In cart (${cartItem.qty})` : '+ Add'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.outOfStock}>Unavailable</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageContainer: {
    width: 96,
    height: 96,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 36 },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  info: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  shopName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  addBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  addBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  addBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  addBtnTextActive: {
    color: colors.primary,
  },
  outOfStock: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
  },
});
