/**
 * Profile store — user profile data, saved addresses, loading states
 * Non-persisted: profile is fetched fresh from the API on each session.
 * (Avoids native-module-not-ready crash when setState is called at module
 *  load time from the demo mock seeder before the native bridge is up.)
 */

import { create } from 'zustand';
import type { Profile, SavedAddress, ProfileStore } from '@/types/profile';
import * as profileService from '@/services/profile';

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  savedAddresses: [],
  loading: false,
  error: null,
  _hasHydrated: true, // no async hydration needed without persist

  fetchProfile: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const profile = await profileService.getProfile(token);
      set({ profile, loading: false, error: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error('Unknown error'),
        loading: false,
      });
    }
  },

  fetchSavedAddresses: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const savedAddresses = await profileService.getSavedAddresses(token);
      set({ savedAddresses, loading: false, error: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err : new Error('Unknown error'),
        loading: false,
      });
    }
  },

  logout: () => {
    set({
      profile: null,
      savedAddresses: [],
      loading: false,
      error: null,
    });
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: Error | null) => set({ error }),
  setProfile: (profile: Profile | null) => set({ profile }),
  setSavedAddresses: (addresses: SavedAddress[]) => set({ savedAddresses: addresses }),
}));
