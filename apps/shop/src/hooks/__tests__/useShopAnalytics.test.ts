/**
 * useShopAnalytics hook tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useShopAnalytics } from '@/hooks/useShopAnalytics';
import { useAuthStore } from '@/store/auth';
import { useAnalyticsStore } from '@/store/analytics';
import { getAnalytics } from '@/services/earnings';
import { getTopProducts } from '@/services/analytics';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AnalyticsData, TopProduct } from '@/types/analytics';

jest.mock('@/services/earnings');
jest.mock('@/services/analytics');
jest.mock('@/hooks/useNetworkStatus');

const mockGetAnalytics = getAnalytics as jest.MockedFunction<typeof getAnalytics>;
const mockGetTopProducts = getTopProducts as jest.MockedFunction<typeof getTopProducts>;
const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;

const mockEarningsData: AnalyticsData = {
  today: {
    views: 100,
    orders: 5,
    revenuePaise: 50000,
  },
  week: [
    { views: 600, orders: 30, revenuePaise: 300000 },
  ],
  month: [
    { views: 2400, orders: 120, revenuePaise: 1200000 },
  ],
  topProducts: [],
};

const mockTopProducts: TopProduct[] = [
  {
    productId: '1',
    productName: 'Product A',
    totalSales: 50,
    totalRevenuePaise: 100000,
    avgRating: 4.5,
  },
];

describe('useShopAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAnalyticsStore.setState({
      data: null,
      topProducts: [],
      loading: false,
      error: null,
      dateRange: '30d',
      isOffline: false,
      lastUpdated: null,
    });
    mockUseNetworkStatus.mockReturnValue(true);
  });

  it('should return initial state', () => {
    useAuthStore.setState({ shopId: null });
    const { result } = renderHook(() => useShopAnalytics());

    expect(result.current.data).toBeNull();
    expect(result.current.topProducts).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.dateRange).toBe('30d');
  });

  it('should fetch analytics on mount', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    mockGetAnalytics.mockResolvedValue(mockEarningsData);
    mockGetTopProducts.mockResolvedValue(mockTopProducts);

    const { result } = renderHook(() => useShopAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetAnalytics).toHaveBeenCalledWith(shopId, '30d');
    expect(mockGetTopProducts).toHaveBeenCalledWith(shopId, 5, '30d');
    expect(result.current.data).toEqual(mockEarningsData);
    expect(result.current.topProducts).toEqual(mockTopProducts);
  });

  it('should handle fetch error', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    const error = new Error('Network error');
    mockGetAnalytics.mockRejectedValue(error);

    const { result } = renderHook(() => useShopAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should update offline status based on network', async () => {
    useAuthStore.setState({ shopId: '123' });
    mockGetAnalytics.mockResolvedValue(mockEarningsData);
    mockGetTopProducts.mockResolvedValue(mockTopProducts);
    mockUseNetworkStatus.mockReturnValue(false);

    const { result } = renderHook(() => useShopAnalytics());

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });

  it('should handle date range change', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    mockGetAnalytics.mockResolvedValue(mockEarningsData);
    mockGetTopProducts.mockResolvedValue(mockTopProducts);

    const { result } = renderHook(() => useShopAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.fetchAnalytics('90d');
    });

    await waitFor(() => {
      expect(mockGetAnalytics).toHaveBeenCalledWith(shopId, '90d');
    });
  });

  it('should support retry', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    mockGetAnalytics.mockResolvedValue(mockEarningsData);
    mockGetTopProducts.mockResolvedValue(mockTopProducts);

    const { result } = renderHook(() => useShopAnalytics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(mockGetAnalytics).toHaveBeenCalledTimes(2);
    });
  });
});
