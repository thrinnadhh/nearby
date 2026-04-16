/**
 * useShopProfile hook — fetch and manage shop profile
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useShopStore } from '@/store/shop';
import {
  getShopProfile,
  toggleShopStatus,
  getEarningsData,
} from '@/services/shop';
import { ShopProfile, EarningsData } from '@/types/shop';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseShopProfileActions {
  fetchProfile: () => Promise<void>;
  fetchEarnings: () => Promise<void>;
  toggleStatus: (isOpen: boolean) => Promise<void>;
  retry: () => Promise<void>;
}

export function useShopProfile(): ShopProfile | null {
  const shopId = useAuthStore((s) => s.shopId);
  const { profile, loading, error, setProfile, setEarnings, setLoading, setError } =
    useShopStore();
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch shop profile on mount
  useEffect(() => {
    if (shopId && !profile && !loading) {
      fetchProfile();
    }
  }, [shopId]);

  const fetchProfile = useCallback(async () => {
    if (!shopId) {
      logger.warn('shopId not available for profile fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getShopProfile(shopId);
      setProfile(data);
      logger.info('Shop profile loaded');
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Failed to load profile';
      setError(message);
      logger.error('Failed to fetch shop profile', { error: message });
    } finally {
      setLoading(false);
    }
  }, [shopId, setProfile, setLoading, setError]);

  const fetchEarnings = useCallback(async () => {
    if (!shopId) {
      logger.warn('shopId not available for earnings fetch');
      return;
    }

    try {
      const data = await getEarningsData(shopId);
      setEarnings(data);
      logger.info('Earnings data loaded');
    } catch (error) {
      logger.error('Failed to fetch earnings', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [shopId, setEarnings]);

  const toggleStatus = useCallback(
    async (isOpen: boolean) => {
      if (!shopId) return;

      setActionLoading(true);
      try {
        await toggleShopStatus(shopId, isOpen);
        // Update local store
        useShopStore.setState((state) => {
          if (state.profile) {
            return {
              profile: { ...state.profile, isOpen },
            };
          }
          return state;
        });
        logger.info('Shop status toggled', { isOpen });
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : 'Failed to toggle status';
        logger.error('Failed to toggle shop status', { error: message });
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [shopId]
  );

  const retry = useCallback(async () => {
    await fetchProfile();
    await fetchEarnings();
  }, [fetchProfile, fetchEarnings]);

  return profile;
}
