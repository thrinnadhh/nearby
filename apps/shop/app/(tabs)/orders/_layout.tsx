/**
 * Orders stack navigator layout
 * Contains orders list and order detail screens
 */

import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
