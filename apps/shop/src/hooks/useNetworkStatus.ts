/**
 * useNetworkStatus hook — detect online/offline state and connection quality
 */

import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

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

      const isSlowConnection =
        networkState.details?.type === 'cellular' &&
        networkState.details?.cellularGeneration &&
        ['2g', '3g'].includes(networkState.details.cellularGeneration);

      setState({
        isOnline,
        isSlowConnection,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}
