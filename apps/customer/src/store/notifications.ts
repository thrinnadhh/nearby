/**
 * Notifications store — pending notifications, seen tracking, loading states
 * Volatile state (not persisted) for runtime notification handling
 */

import { create } from 'zustand';
import type { NotificationPayload, NotificationStore } from '@/types/notifications';

export const useNotificationStore = create<NotificationStore>((set) => ({
  pendingNotifications: [],
  seenNotificationIds: new Set<string>(),
  loading: false,

  addNotification: (notification: NotificationPayload) =>
    set((state) => ({
      pendingNotifications: [...state.pendingNotifications, notification],
    })),

  markAsSeen: (notificationId: string) =>
    set((state) => ({
      seenNotificationIds: new Set([...state.seenNotificationIds, notificationId]),
    })),

  clearNotifications: () =>
    set({
      pendingNotifications: [],
      seenNotificationIds: new Set<string>(),
    }),

  setLoading: (loading: boolean) => set({ loading }),
}));
