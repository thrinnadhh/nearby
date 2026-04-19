/**
 * Root navigation component
 */

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { usePartnerStore } from '@/store/partner';
import { BottomTabNavigator } from './BottomTabNavigator';
import logger from '@/utils/logger';

/**
 * Main app router — switches between authenticated and unauthenticated views
 */
export function RootNavigator() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { setProfile } = usePartnerStore();

  useEffect(() => {
    logger.info('RootNavigator mounted', { isAuthenticated });
  }, [isAuthenticated]);

  // Wait for auth store to hydrate
  if (!_hasHydrated) {
    return null; // Splash screen handled by root app
  }

  // TODO: In production, fetch partner profile here and call setProfile()
  // For now, show authenticated UI

  if (isAuthenticated) {
    return <BottomTabNavigator />;
  }

  // Show login/register screen (placeholder)
  return null;
}
