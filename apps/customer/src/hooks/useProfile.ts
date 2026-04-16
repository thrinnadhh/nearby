/**
 * useProfile hook — fetch and manage user profile data
 */

import { useEffect, useCallback } from 'react';
import { useProfileStore } from '@/store/profile';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';

export function useProfile() {
  const { profile, loading, error, fetchProfile, fetchSavedAddresses } = useProfileStore();
  const token = useAuthStore((s) => s.token);

  // Fetch profile and addresses on mount (only if authenticated)
  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        await Promise.all([fetchProfile(token), fetchSavedAddresses(token)]);
      } catch (err) {
        logger.error('Failed to load profile', { error: err instanceof Error ? err.message : 'Unknown' });
      }
    };

    load();
  }, [token, fetchProfile, fetchSavedAddresses]);

  // Manual refetch
  const refetch = useCallback(async () => {
    if (!token) return;
    try {
      await Promise.all([fetchProfile(token), fetchSavedAddresses(token)]);
    } catch (err) {
      logger.error('Failed to refetch profile', { error: err instanceof Error ? err.message : 'Unknown' });
    }
  }, [token, fetchProfile, fetchSavedAddresses]);

  return {
    profile,
    loading,
    error,
    refetch,
  };
}
