/**
 * Auth stack navigator layout
 * Contains login and OTP verification screens
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    />
  );
}
