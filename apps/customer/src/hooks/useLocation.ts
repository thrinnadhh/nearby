import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '@/store/location';
import { useAuthStore } from '@/store/auth';
import { reverseGeocode } from '@/services/location';

/**
 * Manages the full location permission + geocoding flow.
 *
 * Usage:
 *   const { requesting, requestLocation } = useLocation();
 *   await requestLocation(); // prompts if needed, stores coords + address
 */
export function useLocation() {
  const [requesting, setRequesting] = useState(false);
  const { setLocation, setPermissionStatus } = useLocationStore();
  const token = useAuthStore((s) => s.token) ?? undefined;

  const requestLocation = useCallback(async (): Promise<boolean> => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionStatus('denied');
        return false;
      }
      setPermissionStatus('granted');

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      const address = await reverseGeocode(coords, token);
      setLocation(coords, address);
      return true;
    } catch {
      return false;
    } finally {
      setRequesting(false);
    }
  }, [setLocation, setPermissionStatus, token]);

  return { requesting, requestLocation };
}
