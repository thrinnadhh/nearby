/**
 * OTP Verification Screen (Task 11.1) — 6-digit OTP entry and verification
 * Verifies OTP and saves JWT to secure store
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function OtpVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const requestPhoneNumber = params.phone ?? '';

  const {
    otp,
    setOtp,
    requestOtpCode,
    verifyOtpCode,
    loading,
    error,
    clearError,
    attemptsRemaining,
  } = useAuth();

  const handleVerify = useCallback(async () => {
    clearError();
    try {
      await verifyOtpCode();
      logger.info('OTP verified, navigating to main app');
      // Zustand store will be updated, root layout will auto-redirect
      router.replace('(tabs)');
    } catch (err) {
      logger.error('OTP verification failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [verifyOtpCode, router, clearError]);

  const handleResendOTP = useCallback(async () => {
    clearError();
    try {
      if (requestPhoneNumber) {
        await requestOtpCode();
        logger.info('OTP resent');
      }
    } catch (err) {
      logger.error('Failed to resend OTP', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [requestPhoneNumber, requestOtpCode, clearError]);

  const isLocked = attemptsRemaining === 0;

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
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {requestPhoneNumber}
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Verification Code"
            placeholder="000000"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            maxLength={6}
            error={error}
            editable={!isLocked}
          />

          {isLocked && (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedText}>
                Too many failed attempts. Please try again later.
              </Text>
            </View>
          )}

          {!isLocked && (
            <>
              <PrimaryButton
                label={loading ? 'Verifying...' : 'Verify OTP'}
                onPress={handleVerify}
                loading={loading}
                disabled={otp.length !== 6 || loading}
                size="lg"
              />

              <View style={styles.resendContainer}>
                <Text style={styles.attemptsText}>
                  Attempts remaining: {attemptsRemaining}
                </Text>
              </View>

              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <PrimaryButton
                label="Resend OTP"
                onPress={handleResendOTP}
                variant="secondary"
                disabled={loading}
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Back to Login"
            onPress={() => router.back()}
            variant="secondary"
            disabled={loading}
          />
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
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },

  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  form: {
    flex: 1,
    marginVertical: spacing.lg,
  },

  lockedBox: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  lockedText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    textAlign: 'center',
  },

  resendContainer: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },

  attemptsText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.warning,
    textAlign: 'center',
  },

  resendText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },

  footer: {
    paddingTop: spacing.lg,
  },
});
