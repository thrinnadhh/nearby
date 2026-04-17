/**
 * Registration Stack Navigator Layout
 * Contains 5 screens: profile, photo, kyc, review, waiting
 * Shows progress indicator at top
 */

import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRegistration } from '@/hooks/useRegistration';
import { ProgressBar } from '@/components/registration/ProgressBar';
import { colors, spacing } from '@/constants/theme';

export default function RegistrationLayout() {
  const router = useRouter();
  const { currentStep, goToStep, shopId } = useRegistration();

  const handleGoBack = useCallback(() => {
    // Prevent back navigation after submission (step 5)
    if (currentStep < 5) {
      if (currentStep === 1) {
        // Go back to auth
        router.push('(auth)/login');
      } else {
        // Go to previous step
        goToStep(Math.max(1, currentStep - 1));
      }
    }
  }, [currentStep, goToStep, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: currentStep < 5, // Hide back button on final step
        headerLeft: ({ pressColor, pressOpacity }) =>
          currentStep < 5 ? (
            <TouchableOpacity
              onPress={handleGoBack}
              style={[styles.backButton]}
              activeOpacity={pressOpacity}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ) : null,
        headerTitle: '',
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerShadowVisible: false,
        animationEnabled: true,
      }}
    >
      {/* Progress bar shown above each screen */}
      <Stack.Screen
        name="profile"
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <ProgressBar currentStep={1} totalSteps={5} />
            </View>
          ),
        }}
      />

      <Stack.Screen
        name="photo"
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <ProgressBar currentStep={2} totalSteps={5} />
            </View>
          ),
        }}
      />

      <Stack.Screen
        name="kyc"
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <ProgressBar currentStep={3} totalSteps={5} />
            </View>
          ),
        }}
      />

      <Stack.Screen
        name="review"
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <ProgressBar currentStep={4} totalSteps={5} />
            </View>
          ),
        }}
      />

      <Stack.Screen
        name="waiting"
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <ProgressBar currentStep={5} totalSteps={5} />
            </View>
          ),
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  backButton: {
    padding: spacing.md,
  },
});
