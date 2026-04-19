/**
 * Unit tests for shop Zustand store
 */

import { useShopStore } from '@/store/shop';
import { ShopProfile, EarningsData } from '@/types/shop';

const PROFILE: ShopProfile = {
  id: 'shop-1',
  name: 'My Kirana',
  category: 'grocery',
  isOpen: true,
  address: '123 Main St',
  phone: '9876543210',
  trustScore: 85,
  kycStatus: 'approved',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const EARNINGS: EarningsData = {
  today: { revenue: 50000, orders: 5, completionRate: 100 },
  thisWeek: { revenue: 250000, orders: 25, completionRate: 96 },
};

beforeEach(() => {
  useShopStore.getState().reset();
});

describe('setProfile', () => {
  it('sets the shop profile', () => {
    useShopStore.getState().setProfile(PROFILE);
    expect(useShopStore.getState().profile?.id).toBe('shop-1');
    expect(useShopStore.getState().profile?.name).toBe('My Kirana');
  });
});

describe('setEarnings', () => {
  it('sets earnings data', () => {
    useShopStore.getState().setEarnings(EARNINGS);
    expect(useShopStore.getState().earnings?.today.orders).toBe(5);
    expect(useShopStore.getState().earnings?.thisWeek.revenue).toBe(250000);
  });
});

describe('toggleOpen', () => {
  it('sets isOpen on existing profile', () => {
    useShopStore.getState().setProfile(PROFILE);
    useShopStore.getState().toggleOpen(false);
    expect(useShopStore.getState().profile?.isOpen).toBe(false);
  });

  it('re-opens shop', () => {
    useShopStore.getState().setProfile({ ...PROFILE, isOpen: false });
    useShopStore.getState().toggleOpen(true);
    expect(useShopStore.getState().profile?.isOpen).toBe(true);
  });

  it('is a no-op when profile is null', () => {
    useShopStore.getState().toggleOpen(false);
    expect(useShopStore.getState().profile).toBeNull();
  });
});

describe('setLoading / setError', () => {
  it('sets loading state', () => {
    useShopStore.getState().setLoading(true);
    expect(useShopStore.getState().loading).toBe(true);

    useShopStore.getState().setLoading(false);
    expect(useShopStore.getState().loading).toBe(false);
  });

  it('sets and clears error', () => {
    useShopStore.getState().setError('Something failed');
    expect(useShopStore.getState().error).toBe('Something failed');

    useShopStore.getState().setError(null);
    expect(useShopStore.getState().error).toBeNull();
  });
});

describe('reset', () => {
  it('clears all shop state', () => {
    useShopStore.getState().setProfile(PROFILE);
    useShopStore.getState().setEarnings(EARNINGS);
    useShopStore.getState().setLoading(true);
    useShopStore.getState().setError('error');
    useShopStore.getState().reset();

    const state = useShopStore.getState();
    expect(state.profile).toBeNull();
    expect(state.earnings).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
