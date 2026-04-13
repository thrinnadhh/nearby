import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coords } from '@/types';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationState {
  coords: Coords | null;
  address: string | null;
  permissionStatus: PermissionStatus;
}

interface LocationActions {
  setLocation: (coords: Coords, address: string) => void;
  setPermissionStatus: (status: PermissionStatus) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState & LocationActions>()(
  persist(
    (set) => ({
      coords: null,
      address: null,
      permissionStatus: 'undetermined',

      setLocation: (coords, address) => set({ coords, address }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      clearLocation: () => set({ coords: null, address: null }),
    }),
    {
      name: 'nearby-location',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
