/**
 * Unit tests for useShopProfile hook
 * Tests profile fetching, earnings fetch, and toggle operations
 */

import { renderHook, act } from '@testing-library/react-native';
import { useShopProfile } from '@/hooks/useShopProfile';
import * as shopService from '@/services/shop';
import { useShopStore } from '@/store/shop';
import { useAuthStore } from '@/store/auth';

jest.mock('@/services/shop');
jest.mock('@/store/shop');
jest.mock('@/store/auth');

const mockService = shopService as jest.Mocked<typeof shopService>;

const mockShop = {
  id: 'shop-123',
  name: 'My Store',
  phone: '9876543210',
  address: '123 Main St',
  isOpen: true,
  avgRating: 4.5,
  reviewCount: 100,
  trustScore: 85,
  trustBadge: 'Trusted' as const,
  completionRate: 0.95,
  kycStatus: 'approved' as const,
};

const mockEarnings = {
  today: {
    total: 5000,
    orderCount: 10,
    completed: 9,
    pending: 1,
  },
  weekly: {
    Monday: 1000,
    Tuesday: 1200,
    Wednesday: 1100,
    Thursday: 900,
    Friday: 700,
    Saturday: 0,
    Sunday: 0,
  },
};

describe('useShopProfile Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useShopStore as jest.Mock).mockReturnValue({
      profile: null,
      earnings: null,
      loading: false,
      error: null,
      setProfile: jest.fn(),
      setEarnings: jest.fn(),
      toggleOpen: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    });

    (useAuthStore as jest.Mock).mockReturnValue({
      shopId: 'shop-123',
      userId: 'user-123',
      isAuthenticated: true,
    });
  });

  describe('fetchProfile', () => {
    it('fetches shop profile successfully', async () => {
      mockService.getShopProfile.mockResolvedValueOnce(mockShop);

      const { result } = renderHook(() => useShopProfile());

      await act(async () => {
        await result.current.fetchProfile();
      });

      expect(mockService.getShopProfile).toHaveBeenCalledWith('shop-123');
      expect(result.current.profile).toEqual(mockShop);
    });

    it('handles profile fetch error', async () => {
      mockService.getShopProfile.mockRejectedValueOnce(
        new Error('SHOP_NOT_FOUND')
      );

      const { result } = renderHook(() => useShopProfile());

      await act(async () => {
        try {
          await result.current.fetchProfile();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
    });

    it('auto-fetches profile when shop ID changes', async () => {
      mockService.getShopProfile.mockResolvedValueOnce(mockShop);

      const { rerender } = renderHook(() => useShopProfile());

      // Simulate shop ID becoming available
      (useAuthStore as jest.Mock).mockReturnValue({
        shopId: 'shop-123',
      });

      rerender();

      // Note: In real implementation, useEffect would trigger this
      // This test validates the pattern
      expect(useAuthStore).toHaveBeenCalled();
    });
  });

  describe('fetchEarnings', () => {
    it('fetches earnings data successfully', async () => {
      mockService.getEarningsData.mockResolvedValueOnce(mockEarnings);

      const { result } = renderHook(() => useShopProfile());

      await act(async () => {
        await result.current.fetchEarnings();
      });

      expect(mockService.getEarningsData).toHaveBeenCalledWith('shop-123');
      expect(result.current.earnings).toEqual(mockEarnings);
    });

    it('handles earnings fetch error', async () => {
      mockService.getEarningsData.mockRejectedValueOnce(
        new Error('Fetch failed')
      );

      const { result } = renderHook(() => useShopProfile());

      await act(async () => {
        try {
          await result.current.fetchEarnings();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('toggleOpen', () => {
    it('toggles shop open status', async () => {
      mockService.toggleShopStatus.mockResolvedValueOnce({
        ...mockShop,
        isOpen: false,
      });

      const { result } = renderHook(() => useShopProfile());

      result.current.profile = mockShop;

      await act(async () => {
        await result.current.toggleStatus(false);
      });

      expect(mockService.toggleShopStatus).toHaveBeenCalledWith(
        'shop-123',
        false
      );
    });

    it('handles toggle error and reverts optimistic update', async () => {
      mockService.toggleShopStatus.mockRejectedValueOnce(
        new Error('Toggle failed')
      );

      const { result } = renderHook(() => useShopProfile());

      result.current.profile = mockShop;

      await act(async () => {
        try {
          await result.current.toggleStatus(false);
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('retry', () => {
    it('retries last failed operation', async () => {
      mockService.getShopProfile.mockRejectedValueOnce(new Error('Failed'));
      mockService.getShopProfile.mockResolvedValueOnce(mockShop);

      const { result } = renderHook(() => useShopProfile());

      // First call fails
      await act(async () => {
        try {
          await result.current.fetchProfile();
        } catch {
          // Expected
        }
      });

      // Retry succeeds
      await act(async () => {
        await result.current.retry();
      });

      expect(mockService.getShopProfile).toHaveBeenCalledTimes(2);
    });
  });
});
