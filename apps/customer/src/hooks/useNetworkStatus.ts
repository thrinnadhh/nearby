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
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;
      const isSlowConnection =
        state.details?.type === 'cellular' &&
        state.details?.cellularGeneration &&
        ['2g', '3g'].includes(state.details.cellularGeneration);

      setState({
        isOnline,
        isSlowConnection,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}
