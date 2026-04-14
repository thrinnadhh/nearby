import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useCartStore, selectCartCount } from '@/store/cart';

export default function TabLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cartCount = useCartStore(selectCartCount);

  // Deep links (nearby-customer://(tabs)/home) bypass app/index.tsx — guard here
  // ensures unauthenticated users can never land on a protected tab screen.
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons name="cart-outline" color={color} size={size} />
              {cartCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: colors.error,
                    borderRadius: 9999,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 2,
                  }}
                >
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 9,
                      fontWeight: '700',
                      lineHeight: 12,
                    }}
                  >
                    {cartCount > 99 ? '99+' : String(cartCount)}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      {/* Hidden route — navigated to via router.push, not shown in tab bar */}
      <Tabs.Screen
        name="shop/[id]"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
