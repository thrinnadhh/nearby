/**
 * useKYCStatus — Poll KYC status every 5 seconds with auto-stop logic
 * Stops polling when approved/rejected
 * Used by waiting.tsx screen
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getKYCStatus } from '@/services/registration';
import { KYCStatusResponse } from '@/types/shop-registration';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

interface UseKYCStatusState {
  status: 'pending' | 'approved' | 'rejected' | 'loading';
  reason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  isApproved: boolean;
  isRejected: boolean;
  isPending: boolean;
  error: string | null;
  isPolling: boolean;
  pollCount: number;
}

interface UseKYCStatusActions {
  startPolling: () => void;
  stopPolling: () => void;
  refetch: () => Promise<void>;
}

export function useKYCStatus(shopId: string): UseKYCStatusState &
  UseKYCStatusActions {
  const [state, setState] = useState<UseKYCStatusState>({
    status: 'loading',
    isApproved: false,
    isRejected: false,
    isPending: true,
    error: null,
    isPolling: false,
    pollCount: 0,
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isPolling: false,
    }));
    logger.debug('KYC polling stopped', { shopId, pollCount: pollCountRef.current });
  }, [shopId]);

  const fetch = useCallback(async () => {
    try {
      const result = await getKYCStatus(shopId);

      const isApproved = result.status === 'approved';
      const isRejected = result.status === 'rejected';
      const isPending = result.status === 'pending';

      setState((prev) => ({
        ...prev,
        status: result.status as 'pending' | 'approved' | 'rejected',
        reason: result.reason,
        approvedAt: result.approvedAt,
        rejectedAt: result.rejectedAt,
        isApproved,
        isRejected,
        isPending,
        error: null,
      }));

      // Auto-stop polling when status changes from pending
      if (isApproved || isRejected) {
        logger.info('KYC status finalized', {
          shopId,
          status: result.status,
          pollCount: pollCountRef.current,
        });
        stopPolling();
      }
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : 'Status fetch failed';

      logger.error('KYC status fetch failed', {
        error: message,
        shopId,
        pollCount: pollCountRef.current,
      });

      setState((prev) => ({
        ...prev,
        error: message,
      }));
    }
  }, [shopId, stopPolling]);

  const startPolling = useCallback(() => {
    logger.info('KYC polling started', { shopId });

    // Initial fetch
    fetch();

    // Set up interval
    pollingIntervalRef.current = setInterval(() => {
      pollCountRef.current += 1;
      setState((prev) => ({
        ...prev,
        pollCount: pollCountRef.current,
      }));

      fetch();

      // Safety limit: stop after 60 polls (5 minutes)
      if (pollCountRef.current >= 60) {
        logger.warn('KYC polling timeout — max retries reached', { shopId });
        stopPolling();
      }
    }, POLL_INTERVAL);

    setState((prev) => ({
      ...prev,
      isPolling: true,
    }));
  }, [shopId, fetch, stopPolling]);

  const refetch = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: 'loading',
    }));
    await fetch();
  }, [fetch]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status: state.status,
    reason: state.reason,
    approvedAt: state.approvedAt,
    rejectedAt: state.rejectedAt,
    isApproved: state.isApproved,
    isRejected: state.isRejected,
    isPending: state.isPending,
    error: state.error,
    isPolling: state.isPolling,
    pollCount: state.pollCount,
    startPolling,
    stopPolling,
    refetch,
  };
}
