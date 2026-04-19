/**
 * useShopSettings hook
 * Manages shop settings form state and API interactions
 */

import { useCallback, useState, useEffect } from 'react';
import { updateShopSettings, fetchShopSettings } from '@/services/shopSettings';
import { useShopStore } from '@/store/shop';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';
import { ShopSettings, UpdateSettingsRequest, DayHours } from '@/types/shopSettings';

export interface UseShopSettingsReturn {
  settings: ShopSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateSettings: (data: UpdateSettingsRequest) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_HOURS: DayHours[] = [
  { day: 'MON', openTime: '09:00', closeTime: '21:00', isClosed: false },
  { day: 'TUE', openTime: '09:00', closeTime: '21:00', isClosed: false },
  { day: 'WED', openTime: '09:00', closeTime: '21:00', isClosed: false },
  { day: 'THU', openTime: '09:00', closeTime: '21:00', isClosed: false },
  { day: 'FRI', openTime: '09:00', closeTime: '21:00', isClosed: false },
  { day: 'SAT', openTime: '09:00', closeTime: '22:00', isClosed: false },
  { day: 'SUN', openTime: '10:00', closeTime: '21:00', isClosed: false },
];

export function useShopSettings(): UseShopSettingsReturn {
  const shopId = useAuthStore((s) => s.shopId);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch settings from API
   */
  const doFetchSettings = useCallback(async () => {
    if (!shopId) {
      logger.warn('useShopSettings: No shopId available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchShopSettings(shopId);
      setSettings(response);

      logger.info('useShopSettings: Settings loaded', { shopId });
    } catch (err) {
      const errorMessage =
        err instanceof AppError ? err.message : 'Failed to load settings';
      setError(errorMessage);
      logger.error('useShopSettings: Fetch failed', {
        shopId,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  /**
   * Update settings
   */
  const doUpdateSettings = useCallback(
    async (data: UpdateSettingsRequest) => {
      if (!shopId) {
        logger.warn('useShopSettings: No shopId available');
        return;
      }

      try {
        setSaving(true);
        setError(null);

        const response = await updateShopSettings({
          shopId,
          data,
        });

        setSettings(response);

        logger.info('useShopSettings: Settings updated', {
          shopId,
          fields: Object.keys(data),
        });
      } catch (err) {
        const errorMessage =
          err instanceof AppError ? err.message : 'Failed to save settings';
        setError(errorMessage);
        logger.error('useShopSettings: Update failed', {
          shopId,
          error: errorMessage,
        });

        throw err; // Re-throw for caller to handle UI feedback
      } finally {
        setSaving(false);
      }
    },
    [shopId]
  );

  /**
   * Initial load
   */
  useEffect(() => {
    doFetchSettings();
  }, [doFetchSettings]);

  return {
    settings: settings || {
      hours: DEFAULT_HOURS,
      deliveryRadiusKm: 3,
      bankAccountNumber: '',
      bankIfsc: '',
      bankAccountName: '',
      description: '',
    },
    loading,
    saving,
    error,
    updateSettings: doUpdateSettings,
    refreshSettings: doFetchSettings,
  };
}
