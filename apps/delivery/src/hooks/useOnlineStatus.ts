/**
 * useOnlineStatus hook — toggle online/offline status
 */

import { useState } from 'react';
import { usePartnerStore } from '@/store/partner';
import { toggleOnlineStatus } from '@/services/partner';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

export function useOnlineStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { profile, updateOnlineStatus } = usePartnerStore();

  const toggleStatus = async (newStatus: boolean) => {
    if (!profile) {
      const msg = 'Partner profile not found';
      setError(msg);
      logger.error('Toggle status: Profile not found');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await toggleOnlineStatus(profile.id, newStatus);
      updateOnlineStatus(newStatus);

      logger.info('Online status toggled', { isOnline: newStatus });
    } catch (err) {
      const message = err instanceof AppErrorClass ? err.message : 'Failed to toggle status';
      setError(message);
      logger.error('Toggle status failed', { error: message });
    } finally {
      setIsLoading(false);
    }
  };

  const goOnline = async () => {
    await toggleStatus(true);
  };

  const goOffline = async () => {
    await toggleStatus(false);
  };

  return {
    isOnline: profile?.isOnline ?? false,
    isLoading,
    error,
    goOnline,
    goOffline,
    toggleStatus,
  };
}
