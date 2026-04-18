/**
 * Unit tests for auth Zustand store
 */

// auth store uses expo-secure-store — mocked in jest.setup.js
// Bypass zustand persist for tests by resetting state directly

import { useAuthStore } from '@/store/auth';

const loginPayload = {
  userId: 'user-1',
  shopId: 'shop-1',
  phone: '9876543210',
  token: 'jwt-abc',
};

beforeEach(() => {
  useAuthStore.getState().logout();
});

describe('login', () => {
  it('sets authenticated state with all fields', () => {
    useAuthStore.getState().login(loginPayload);
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.userId).toBe('user-1');
    expect(state.shopId).toBe('shop-1');
    expect(state.phone).toBe('9876543210');
    expect(state.token).toBe('jwt-abc');
    expect(state.role).toBe('shop_owner');
  });
});

describe('logout', () => {
  it('clears all auth state', () => {
    useAuthStore.getState().login(loginPayload);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.shopId).toBeNull();
    expect(state.phone).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
  });
});

describe('setHasHydrated', () => {
  it('updates _hasHydrated flag', () => {
    useAuthStore.getState().setHasHydrated(true);
    expect(useAuthStore.getState()._hasHydrated).toBe(true);

    useAuthStore.getState().setHasHydrated(false);
    expect(useAuthStore.getState()._hasHydrated).toBe(false);
  });
});

describe('initial state', () => {
  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.shopId).toBeNull();
    expect(state.token).toBeNull();
  });
});
