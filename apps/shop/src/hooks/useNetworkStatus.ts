/**
 * useNetworkStatus hook — detect online/offline state and connection quality
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoCellularState } from '@react-native-community/netinfo';

interface NetworkState {
  isOnline: boolean;
  isSlowConnection: boolean;
}

export function useNetworkStatus(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: true,
    isSlowConnection: false,
  });

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((networkState) => {
      const isOnline =
        networkState.isConnected === true &&
        networkState.isInternetReachable !== false;

      // Safely check for cellular details — the details object is typed per connection type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const details = networkState.details as any;
      const isSlowConnection =
        networkState.type === 'cellular' &&
        !!details?.cellularGeneration &&
        ['2g', '3g'].includes(details.cellularGeneration ?? '');

      setState({
        isOnline,
        isSlowConnection,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}
