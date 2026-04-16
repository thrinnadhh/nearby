/**
 * Zustand notifications store — deep-link targets and notification state
 */

import { create } from 'zustand';
import logger from '@/utils/logger';

interface NotificationsState {
  deepLinkTarget: string | null;
}

interface NotificationsActions {
  setDeepLinkTarget: (target: string | null) => void;
  reset: () => void;
}

const initialState: NotificationsState = {
  deepLinkTarget: null,
};

export const useNotificationsStore = create<
  NotificationsState & NotificationsActions
>((set) => ({
  ...initialState,

  setDeepLinkTarget: (target) => {
    if (target) {
      logger.info('Deep-link target set', { target });
    }
    set({ deepLinkTarget: target });
  },

  reset: () => {
    logger.info('Notifications store reset');
    set(initialState);
  },
}));
