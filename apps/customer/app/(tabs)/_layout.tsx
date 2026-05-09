import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fontFamily } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useCartStore, selectCartCount } from '@/store/cart';
import { DEMO_MODE } from '@/config/demo';

// ─── Tab configuration ────────────────────────────────────────────────────────
const VISIBLE_TABS = ['home', 'search', 'cart', 'profile'] as const;
type VisibleTab = typeof VISIBLE_TABS[number];

const TAB_ICONS: Record<VisibleTab, { off: keyof typeof Ionicons.glyphMap; on: keyof typeof Ionicons.glyphMap }> = {
  home:    { off: 'home-outline',   on: 'home' },
  search:  { off: 'search-outline', on: 'search' },
  cart:    { off: 'cart-outline',   on: 'cart' },
  profile: { off: 'person-outline', on: 'person' },
};

const TAB_LABELS: Record<VisibleTab, string> = {
  home: 'Home', search: 'Search', cart: 'Cart', profile: 'Profile',
};

// ─── Cart badge ───────────────────────────────────────────────────────────────
function CartBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  );
}

// ─── Custom tab bar ───────────────────────────────────────────────────────────
function NearByTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore(selectCartCount);

  const visibleRoutes = state.routes.filter((r) =>
    (VISIBLE_TABS as readonly string[]).includes(r.name),
  );

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {visibleRoutes.map((route) => {
        const name = route.name as VisibleTab;
        const isFocused = state.routes[state.index]?.name === route.name;
        const iconSet = TAB_ICONS[name];
        const label   = TAB_LABELS[name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
            style={styles.tabItem}
            activeOpacity={0.65}
          >
            {/* Active pip */}
            <View style={[styles.pip, isFocused && styles.pipActive]} />

            {/* Icon with optional cart badge */}
            <View style={styles.iconWrap}>
              <Ionicons
                name={isFocused ? iconSet.on : iconSet.off}
                color={isFocused ? colors.primary : colors.textSecondary}
                size={23}
              />
              {name === 'cart' && <CartBadge count={cartCount} />}
            </View>

            {/* Label */}
            <Text
              style={[styles.tabLabel, isFocused ? styles.tabLabelActive : styles.tabLabelInactive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated && !DEMO_MODE) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <NearByTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* ── Visible tabs ────────────────────────────────────────────── */}
      <Tabs.Screen name="home"    options={{ title: 'Home' }} />
      <Tabs.Screen name="search"  options={{ title: 'Search' }} />
      <Tabs.Screen name="cart"    options={{ title: 'Cart' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

      {/* ── Hidden routes — navigate via router.push, never in tab bar ── */}
      <Tabs.Screen name="shop/[id]"                    options={{ href: null }} />
      <Tabs.Screen name="checkout"                     options={{ href: null }} />
      <Tabs.Screen name="order-history"                options={{ href: null }} />
      <Tabs.Screen name="order-confirmed/[orderId]"    options={{ href: null }} />
      <Tabs.Screen name="order-detail/[id]"            options={{ href: null }} />
      <Tabs.Screen name="order-detail/cancel-modal"    options={{ href: null }} />
      <Tabs.Screen name="tracking/[orderId]"           options={{ href: null }} />
      <Tabs.Screen name="delivery-confirmed/[orderId]" options={{ href: null }} />
      <Tabs.Screen name="disputes/index"               options={{ href: null }} />
      <Tabs.Screen name="disputes/[id]"                options={{ href: null }} />
      <Tabs.Screen name="disputes/new"                 options={{ href: null }} />
      <Tabs.Screen name="reviews/compose/[orderId]"    options={{ href: null }} />
      <Tabs.Screen name="partner-profile/[partnerId]"  options={{ href: null }} />
      <Tabs.Screen name="payment/[orderId]"            options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 0,
    // shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    // elevation (Android)
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingBottom: 4,
    minHeight: 52,
  },
  pip: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 5,
  },
  pipActive: {
    backgroundColor: colors.primary,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 26,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabLabelInactive: {
    color: colors.textSecondary,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    backgroundColor: colors.error,
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
