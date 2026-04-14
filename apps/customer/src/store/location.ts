import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coords } from '@/types';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationState {
  /** Device GPS coords — used for nearby shop radius search */
  coords: Coords | null;
  /** Human-readable form of device coords */
  address: string | null;
  permissionStatus: PermissionStatus;
  /** Explicitly confirmed delivery address (defaults to GPS address) */
  deliveryAddress: string | null;
  /** Coords for the confirmed delivery address */
  deliveryCoords: Coords | null;
}

interface LocationActions {
  setLocation: (coords: Coords, address: string) => void;
  setPermissionStatus: (status: PermissionStatus) => void;
  clearLocation: () => void;
  /** Save the address the user picked for delivery */
  setDeliveryAddress: (address: string, coords: Coords) => void;
}

export const useLocationStore = create<LocationState & LocationActions>()(
  persist(
    (set) => ({
      coords: null,
      address: null,
      permissionStatus: 'undetermined',
      deliveryAddress: null,
      deliveryCoords: null,

      setLocation: (coords, address) =>
        set((state) => ({
          coords,
          address,
          // Auto-seed delivery address on first GPS fix only
          deliveryAddress: state.deliveryAddress ?? address,
          deliveryCoords: state.deliveryCoords ?? coords,
        })),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      clearLocation: () =>
        set({ coords: null, address: null, deliveryAddress: null, deliveryCoords: null }),
      setDeliveryAddress: (address, coords) =>
        set({ deliveryAddress: address, deliveryCoords: coords }),
    }),
    {
      name: 'nearby-location',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
