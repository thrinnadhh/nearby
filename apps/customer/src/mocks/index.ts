/**
 * Demo bootstrap — runs at module load time (before any React render).
 *
 * When DEMO_MODE = true this file synchronously seeds all Zustand stores
 * with realistic fake data so the app works without a backend.
 *
 * Import this file ONCE, early in app/_layout.tsx:
 *   import '@/mocks';
 */
import { DEMO_MODE } from '@/config/demo';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/location';
import { useProfileStore } from '@/store/profile';
import { DEMO_PROFILE, DEMO_SAVED_ADDRESSES } from './data';

if (DEMO_MODE) {
  // Pre-seed auth — marks the user as logged in and skips OTP flow.
  useAuthStore.setState({
    isAuthenticated: true,
    userId: 'demo-user-1',
    phone: '+919876543210',
    token: 'demo-token',
    role: 'customer',
    _hasHydrated: true,   // prevents RootLayout from waiting on SecureStore
  });

  // Pre-seed location — skips GPS permission prompt.
  useLocationStore.setState({
    coords: { lat: 17.4126, lng: 78.4458 },
    address: 'Banjara Hills, Hyderabad',
    permissionStatus: 'granted',
    deliveryAddress: '12, MG Road, Banjara Hills, Hyderabad - 500034',
    deliveryCoords: { lat: 17.4126, lng: 78.4458 },
  });

  // Pre-seed profile — profile screen renders immediately.
  useProfileStore.setState({
    profile: DEMO_PROFILE,
    savedAddresses: DEMO_SAVED_ADDRESSES,
    loading: false,
    error: null,
    _hasHydrated: true,
  });
}
