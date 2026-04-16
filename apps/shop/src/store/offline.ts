/**
 * Zustand offline store — retry queue for failed requests
 * Stores failed mutations to re-execute when connection restored
 */

import { create } from 'zustand';
import logger from '@/utils/logger';

export interface QueuedAction {
  id: string;
  action: 'accept_order' | 'reject_order' | 'toggle_shop';
  orderId?: string;
  reason?: string;
  timestamp: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedAction[];
}

interface OfflineActions {
  setOnline: (online: boolean) => void;
  addToQueue: (action: QueuedAction) => void;
  removeFromQueue: (actionId: string) => void;
  clearQueue: () => void;
}

const initialState: OfflineState = {
  isOnline: true,
  queue: [],
};

export const useOfflineStore = create<OfflineState & OfflineActions>((set) => ({
  ...initialState,

  setOnline: (online) => {
    logger.info('Online status changed', { online });
    set({ isOnline: online });
  },

  addToQueue: (action) => {
    logger.info('Action queued for retry', { actionId: action.id });
    set((state) => ({
      queue: [...state.queue, action],
    }));
  },

  removeFromQueue: (actionId) => {
    logger.info('Action removed from queue', { actionId });
    set((state) => ({
      queue: state.queue.filter((a) => a.id !== actionId),
    }));
  },

  clearQueue: () => {
    logger.info('Offline queue cleared');
    set({ queue: [] });
  },
}));
