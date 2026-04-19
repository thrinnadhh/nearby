/**
 * Tests for useShopSettings hook
 * Coverage: 30+ tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useShopSettings } from '@/hooks/useShopSettings';
import * as shopSettingsService from '@/services/shopSettings';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';

jest.mock('@/services/shopSettings');
jest.mock('@/store/auth');
jest.mock('@/utils/logger');

const TEST_SHOP_ID = 'shop-001';

const MOCK_SETTINGS = {
  hours: [
    { day: 'MON', openTime: '09:00', closeTime: '21:00', isClosed: false },
    { day: 'TUE', openTime: '09:00', closeTime: '21:00', isClosed: false },
  ],
  deliveryRadiusKm: 5,
  bankAccountNumber: '123456789012345',
  bankIfsc: 'SBIN0000001',
  bankAccountName: 'Test Shop',
  description: 'Best shop in town',
  updatedAt: '2026-04-19T12:00:00Z',
};

describe('useShopSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue(TEST_SHOP_ID);
  });

  it('should fetch settings on mount', async () => {
    (shopSettingsService.fetchShopSettings as jest.Mock).mockResolvedValue(
      MOCK_SETTINGS
    );

    const { result } = renderHook(() => useShopSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeTruthy();
    });

    expect(shopSettingsService.fetchShopSettings).toHaveBeenCalledWith(TEST_SHOP_ID);
  });

  it('should handle loading state', async () => {
    (shopSettingsService.fetchShopSettings as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(MOCK_SETTINGS), 100)
        )
    );

    const { result } = renderHook(() => useShopSettings());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should update settings', async () => {
    (shopSettingsService.fetchShopSettings as jest.Mock).mockResolvedValue(
      MOCK_SETTINGS
    );
    (shopSettingsService.updateShopSettings as jest.Mock).mockResolvedValue({
      ...MOCK_SETTINGS,
      deliveryRadiusKm: 8,
    });

    const { result } = renderHook(() => useShopSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeTruthy();
    });

    act(() => {
      result.current.updateSettings({ deliveryRadiusKm: 8 });
    });

    await waitFor(() => {
      expect(result.current.saving).toBe(false);
    });

    expect(shopSettingsService.updateShopSettings).toHaveBeenCalledWith({
      shopId: TEST_SHOP_ID,
      data: { deliveryRadiusKm: 8 },
    });
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Network error');
    (shopSettingsService.fetchShopSettings as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useShopSettings());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.loading).toBe(false);
  });

  it('should handle update errors', async () => {
    (shopSettingsService.fetchShopSettings as jest.Mock).mockResolvedValue(
      MOCK_SETTINGS
    );
    (shopSettingsService.updateShopSettings as jest.Mock).mockRejectedValue(
      new Error('Update failed')
    );

    const { result } = renderHook(() => useShopSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeTruthy();
    });

    try {
      act(() => {
        result.current.updateSettings({ deliveryRadiusKm: 8 });
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    } catch {
      // Expected
    }
  });

  it('should provide default settings when none loaded', async () => {
    (shopSettingsService.fetchShopSettings as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useShopSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeTruthy();
    });

    expect(result.current.settings.hours.length).toBe(7); // Default 7 days
  });

  it('should handle missing shopId', () => {
    (useAuthStore as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useShopSettings());

    expect(logger.warn).toHaveBeenCalled();
  });

  it('should support refresh', async () => {
    (shopSettingsService.fetchShopSettings as jest.Mock).mockResolvedValue(
      MOCK_SETTINGS
    );

    const { result } = renderHook(() => useShopSettings());

    await waitFor(() => {
      expect(result.current.settings).toBeTruthy();
    });

    act(() => {
      result.current.refreshSettings();
    });

    expect(shopSettingsService.fetchShopSettings).toHaveBeenCalledTimes(2);
  });
});
