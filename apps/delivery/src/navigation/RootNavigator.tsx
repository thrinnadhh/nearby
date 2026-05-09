/**
 * Root navigation component — switches between auth and app screens
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/auth';
import { usePartnerStore } from '@/store/partner';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OTPVerifyScreen } from '@/screens/auth/OTPVerifyScreen';
import { AadhaarScreen } from '@/screens/AadhaarScreen';
import { VehiclePhotoScreen } from '@/screens/VehiclePhotoScreen';
import { BankDetailsScreen } from '@/screens/BankDetailsScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import logger from '@/utils/logger';

const Stack = createNativeStackNavigator();

/**
 * Main app router — switches between authenticated and unauthenticated views
 */
export function RootNavigator() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { profile } = usePartnerStore();

  useEffect(() => {
    logger.info('RootNavigator state changed', {
      isAuthenticated,
      hasProfile: !!profile,
    });
  }, [isAuthenticated, profile]);

  // Wait for auth store to hydrate
  if (!_hasHydrated) {
    return null; // Splash screen handled by root app
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          // Authenticated stack — show main app
          <Stack.Screen
            name="App"
            component={BottomTabNavigator}
            options={{ animation: 'none' }}
          />
        ) : (
          // Unauthenticated stack — show auth flows
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="OTPVerify"
              component={OTPVerifyScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="Aadhaar"
              component={AadhaarScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="VehiclePhoto"
              component={VehiclePhotoScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="BankDetails"
              component={BankDetailsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
