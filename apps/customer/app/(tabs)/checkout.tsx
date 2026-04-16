import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { useCartStore, selectCartTotal } from '@/store/cart';
import { useLocationStore } from '@/store/location';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { createOrder, generateIdempotencyKey } from '@/services/orders';
import { searchProducts } from '@/services/search';
import logger from '@/utils/logger';
import type { OrderItem as OrderItemType } from '@/types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function paise(amount: number) {
  return `₹${(amount / 100).toFixed(2)}`;
}

const DELIVERY_FEE_PAISE = 2500; // ₹25 flat
const TAX_RATE = 0.05; // 5% tax

// ─── Order item display ──────────────────────────────────────────────────────

interface OrderItemProps {
  item: {
    product: { name: string; price: number };
    qty: number;
  };
}

function OrderItemRow({ item }: OrderItemProps) {
  return (
    <View style={styles.orderItemRow}>
      <Text style={styles.orderItemName} numberOfLines={1}>
        {item.product.name}
      </Text>
      <View style={styles.orderItemRight}>
        <Text style={styles.orderItemQty}>×{item.qty}</Text>
        <Text style={styles.orderItemPrice}>
          {paise(item.product.price * item.qty)}
        </Text>
      </View>
    </View>
  );
}

// ─── Payment method selector ──────────────────────────────────────────────────

interface PaymentMethodProps {
  value: 'upi' | 'cod';
  onChange: (method: 'upi' | 'cod') => void;
}

function PaymentMethodSelector({ value, onChange }: PaymentMethodProps) {
  return (
    <View style={styles.paymentMethodContainer}>
      <Text style={styles.sectionTitle}>Payment method</Text>

      {/* UPI */}
      <TouchableOpacity
        style={[styles.paymentOption, value === 'upi' && styles.paymentOptionSelected]}
        onPress={() => onChange('upi')}
      >
        <View style={styles.paymentOptionLeft}>
          <Ionicons
            name={value === 'upi' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={value === 'upi' ? colors.primary : colors.textSecondary}
          />
          <View style={styles.paymentOptionText}>
            <Text style={styles.paymentOptionLabel}>UPI / Card</Text>
            <Text style={styles.paymentOptionDesc}>Pay via Cashfree</Text>
          </View>
        </View>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      </TouchableOpacity>

      {/* COD */}
      <TouchableOpacity
        style={[styles.paymentOption, value === 'cod' && styles.paymentOptionSelected]}
        onPress={() => onChange('cod')}
      >
        <View style={styles.paymentOptionLeft}>
          <Ionicons
            name={value === 'cod' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={value === 'cod' ? colors.primary : colors.textSecondary}
          />
          <View style={styles.paymentOptionText}>
            <Text style={styles.paymentOptionLabel}>Cash on Delivery</Text>
            <Text style={styles.paymentOptionDesc}>Pay at delivery</Text>
          </View>
        </View>
        {value === 'cod' && (
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Main checkout screen ─────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const token = useAuthStore((s) => s.token);
  const { items, shopId, clearCart } = useCartStore();
  const subtotal = useCartStore(selectCartTotal);
  const { deliveryAddress, deliveryCoords } = useLocationStore();
  const { setActiveOrder } = useOrdersStore();

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Validation ──────────────────────────────────────────────────────────
  const isValid = useMemo(() => {
    return (
      items.length > 0 &&
      shopId &&
      deliveryAddress &&
      deliveryCoords &&
      token
    );
  }, [items, shopId, deliveryAddress, deliveryCoords, token]);

  // ── Price breakdown ─────────────────────────────────────────────────────
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + DELIVERY_FEE_PAISE + tax;

  // ── Handlers ────────────────────────────────────────────────────────────

  /**
   * Re-fetch fresh product prices from server before creating order.
   * This ensures prices haven't changed since the user added items to cart.
   */
  const enrichItemsBeforeCheckout = useCallback(async (): Promise<OrderItemType[]> => {
    if (!shopId || !token) throw new Error('Missing shop or auth');

    const { data: freshProducts } = await searchProducts(
      { q: '', shopId, limit: 50 },
      token
    );

    // Reconstruct items with fresh server prices
    const freshItems: OrderItemType[] = items
      .map(({ product: cartProduct, qty }) => {
        const freshProduct = freshProducts.find((p) => p.id === cartProduct.id);
        if (!freshProduct) return null; // Product deleted

        return {
          product_id: freshProduct.id,
          name: freshProduct.name,
          price: freshProduct.price,
          qty,
        };
      })
      .filter((item): item is OrderItemType => item !== null);

    if (freshItems.length === 0) {
      throw new Error('No valid items in cart');
    }

    return freshItems;
  }, [shopId, token, items]);

  const handlePlaceOrder = async () => {
    if (!isValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Re-enrich items with fresh server prices
      const freshItems = await enrichItemsBeforeCheckout();

      // Calculate fresh total (in case prices changed)
      const freshSubtotal = freshItems.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
      );
      const freshTax = Math.round(freshSubtotal * TAX_RATE);
      const freshTotal = freshSubtotal + DELIVERY_FEE_PAISE + freshTax;

      // 2. Create order with idempotency key
      const order = await createOrder({
        shop_id: shopId,
        items: freshItems,
        delivery_address: deliveryAddress,
        delivery_coords: deliveryCoords,
        payment_method: paymentMethod,
        total_paise: freshTotal,
        idempotency_key: generateIdempotencyKey(),
      });

      // 3. Save active order in store
      setActiveOrder(order);

      // 4. Clear cart
      clearCart();

      // 5. Navigate based on payment method
      if (paymentMethod === 'upi') {
        // Sprint 9.2: Redirect to payment gateway
        router.push(`/(tabs)/payment/${order.id}`);
      } else {
        // Sprint 9.4: Show order confirmed (countdown to acceptance)
        router.push(`/(tabs)/order-confirmed/${order.id}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to place order';
      Alert.alert('Order failed', message);
      logger.error('[CheckoutScreen] Order creation error', { error });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditAddress = () => {
    router.push('/address-picker');
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (!isValid) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to proceed. Please ensure cart items, delivery address, and
            payment method are selected.
          </Text>
          <TouchableOpacity
            style={styles.errorBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.errorBtnText}>Back to cart</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          <TouchableOpacity style={styles.addressCard} onPress={handleEditAddress}>
            <View style={styles.addressCardLeft}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={styles.addressCardText} numberOfLines={2}>
                {deliveryAddress}
              </Text>
            </View>
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Order Items Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order items</Text>
          <View style={styles.itemsCard}>
            {items.map((item) => (
              <OrderItemRow key={item.product.id} item={item} />
            ))}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price breakdown</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>{paise(subtotal)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery fee</Text>
              <Text style={styles.priceValue}>{paise(DELIVERY_FEE_PAISE)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax (5%)</Text>
              <Text style={styles.priceValue}>{paise(tax)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{paise(total)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, isProcessing && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place order</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    paddingVertical: spacing.md,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Sections ────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // ── Address ─────────────────────────────────────────────────────────────
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  addressCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addressCardText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },

  // ── Order items ─────────────────────────────────────────────────────────
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderItemName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  orderItemRight: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  orderItemQty: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    minWidth: 30,
    textAlign: 'right',
  },
  orderItemPrice: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    minWidth: 50,
    textAlign: 'right',
  },

  // ── Price breakdown ─────────────────────────────────────────────────────
  priceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // ── Payment method ──────────────────────────────────────────────────────
  paymentMethodContainer: {
    marginBottom: spacing.xl,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  paymentOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  paymentOptionDesc: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.white,
  },

  // ── Error state ─────────────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: fontSize.md * 1.5,
  },
  errorBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorBtnText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
});
