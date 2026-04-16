/**
 * Login Screen (Task 11.1) — Phone number entry
 * Validates phone and requests OTP
 */

import { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { InputField } from '@/components/common/InputField';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import logger from '@/utils/logger';

export default function LoginScreen() {
  const router = useRouter();
  const { phone, setPhone, requestOtpCode, loading, error, clearError } =
    useAuth();

  const handleContinue = useCallback(async () => {
    clearError();
    try {
      const result = await requestOtpCode();
      logger.info('OTP requested, navigating to verify', {
        requestId: result.requestId,
      });
      // Navigate to OTP verification screen
      router.push({
        pathname: '(auth)/otp-verify',
        params: { phone },
      });
    } catch (err) {
      logger.error('Failed to request OTP', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [phone, requestOtpCode, router, clearError]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>NearBy</Text>
          <Text style={styles.subtitle}>Shop Owner App</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign In to Your Shop</Text>

          <InputField
            label="Phone Number"
            placeholder="Enter 10-digit phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            error={error}
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <PrimaryButton
            label={loading ? 'Requesting OTP...' : 'Continue'}
            onPress={handleContinue}
            loading={loading}
            disabled={phone.length !== 10 || loading}
            size="lg"
          />

          <View style={styles.helpText}>
            <Text style={styles.helpLabel}>
              We'll send a 6-digit verification code to confirm your number
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Having trouble logging in?{' '}
            <Text style={styles.footerLink}>Contact Support</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },

  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },

  title: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  subtitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  form: {
    flex: 1,
    marginVertical: spacing.xl,
  },

  formTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  errorBox: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
  },

  helpText: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
  },

  helpLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.primary,
    lineHeight: 18,
  },

  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },

  footerText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  footerLink: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
});
