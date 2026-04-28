import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  connectSocket,
  disconnectSocket,
  onOrderUpdated,
  onOrderStuckAlert,
  offOrderUpdated,
  offOrderStuckAlert,
} from '@/services/socket';

export function useSocket() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }

    return () => {
      disconnectSocket();
    };
  }, [token]);
}

export function useOrderUpdates(
  callback: (data: Record<string, unknown>) => void,
): void {
  useEffect(() => {
    onOrderUpdated(callback);

    return () => {
      offOrderUpdated(callback);
    };
  }, [callback]);
}

export function useOrderStuckAlerts(
  callback: (data: Record<string, unknown>) => void,
): void {
  useEffect(() => {
    onOrderStuckAlert(callback);

    return () => {
      offOrderStuckAlert(callback);
    };
  }, [callback]);
}
