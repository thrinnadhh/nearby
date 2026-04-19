/**
 * Unit tests for useShopProfile hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useShopProfile } from '@/hooks/useShopProfile';
import { useAuthStore } from '@/store/auth';
import { useShopStore } from '@/store/shop';
import * as shopService from '@/services/shop';

jest.mock('@/store/auth');
jest.mock('@/store/shop');
jest.mock('@/services/shop');

const mockSetProfile = jest.fn();
const mockSetEarnings = jest.fn();
const mockSetLoading = jest.fn();
const mockSetError = jest.fn();

const PROFILE = {
  id: 'shop-1',
  name: 'My Kirana',
  category: 'grocery',
  isOpen: true,
  address: '123 Main St',
  phone: '9876543210',
  trustScore: 85,
  kycStatus: 'approved' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const EARNINGS = {
  today: { revenue: 50000, orders: 5, completionRate: 100 },
  thisWeek: { revenue: 250000, orders: 25, completionRate: 96 },
};

function makeShopStoreMock(overrides = {}) {
  return {
    profile: null,
    earnings: null,
    loading: false,
    error: null,
    setProfile: mockSetProfile,
    setEarnings: mockSetEarnings,
    setLoading: mockSetLoading,
    setError: mockSetError,
    toggleOpen: jest.fn(),
    reset: jest.fn(),
    setState: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: any) => any) =>
    selector({ shopId: 'shop-1' })
  );
  (useShopStore as unknown as jest.Mock).mockReturnValue(makeShopStoreMock());
  (useShopStore as any).setState = jest.fn();
});

describe('useShopProfile — profile fetch', () => {
  it('returns null when no profile loaded yet', () => {
    (shopService.getShopProfile as jest.Mock).mockResolvedValue(PROFILE);
    const { result } = renderHook(() => useShopProfile());
    expect(result.current).toBeNull();
  });

  it('returns profile when store has data', () => {
    (useShopStore as unknown as jest.Mock).mockReturnValue(
      makeShopStoreMock({ profile: PROFILE })
    );

    const { result } = renderHook(() => useShopProfile());
    expect(result.current?.id).toBe('shop-1');
  });

  it('fetches profile on mount when shopId available and no profile', async () => {
    (shopService.getShopProfile as jest.Mock).mockResolvedValue(PROFILE);

    renderHook(() => useShopProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(shopService.getShopProfile).toHaveBeenCalledWith('shop-1');
    expect(mockSetProfile).toHaveBeenCalledWith(PROFILE);
  });

  it('does not fetch when profile already exists', () => {
    (useShopStore as unknown as jest.Mock).mockReturnValue(
      makeShopStoreMock({ profile: PROFILE })
    );
    (shopService.getShopProfile as jest.Mock).mockResolvedValue(PROFILE);

    renderHook(() => useShopProfile());

    expect(shopService.getShopProfile).not.toHaveBeenCalled();
  });

  it('sets error on fetch failure', async () => {
    (shopService.getShopProfile as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    renderHook(() => useShopProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockSetError).toHaveBeenCalledWith('Failed to load profile');
  });
});

describe('fetchEarnings', () => {
  it('does not crash when shopId is missing', async () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: any) => any) =>
      selector({ shopId: null })
    );
    (shopService.getEarningsData as jest.Mock).mockResolvedValue(EARNINGS);

    renderHook(() => useShopProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(shopService.getEarningsData).not.toHaveBeenCalled();
  });
});
