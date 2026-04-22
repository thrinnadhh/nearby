/**
 * OTP verification screen — 6-digit OTP entry and verification
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { verifyOTP } from '@/services/auth';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

interface OTPVerifyScreenProps {
  phone: string;
  onVerified: () => void;
  onRetry: () => void;
}

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;

export function OTPVerifyScreen({
  phone,
  onVerified,
  onRetry,
}: OTPVerifyScreenProps): React.ReactElement {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const inputRef = useRef<TextInput>(null);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= OTP_LENGTH) {
      setOtp(cleaned);
      setError('');
    }
  };

  const validateOtp = (): boolean => {
    if (otp.length !== OTP_LENGTH) {
      setError(`OTP must be ${OTP_LENGTH} digits`);
      return false;
    }
    return true;
  };

  const handleVerify = async () => {
    if (!validateOtp()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await verifyOTP({ phone, otp });
      logger.info('OTP verified successfully', {
        phone: phone.slice(-4),
        userId: response.userId,
      });

      login({
        userId: response.userId,
        partnerId: response.partnerId || undefined,
        phone,
        token: response.token,
      });

      onVerified();
    } catch (err) {
      const message =
        err instanceof AppErrorClass
          ? err.message
          : 'Failed to verify OTP. Please try again.';
      logger.error('OTP verification failed', {
        phone: phone.slice(-4),
        error: message,
      });

      if (err instanceof AppErrorClass && err.code === 'OTP_LOCKED') {
        Alert.alert('Too Many Attempts', message);
        onRetry();
      } else {
        setError(message);
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isOtpValid = otp.length === OTP_LENGTH;
  const isExpired = timeLeft === 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to {phone}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="000000"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              value={otp}
              onChangeText={handleOtpChange}
              editable={!isLoading && !isExpired}
              accessible
              accessibilityLabel="OTP input"
              accessibilityHint={`Enter the ${OTP_LENGTH}-digit OTP`}
            />

            <View style={styles.timerContainer}>
              <Text
                style={[
                  styles.timerText,
                  isExpired && styles.timerExpired,
                ]}
              >
                {formatTime(timeLeft)}
              </Text>
            </View>

            {error && (
              <Text
                style={styles.errorText}
                accessible
                accessibilityRole="alert"
              >
                {error}
              </Text>
            )}

            {isExpired && (
              <Pressable
                onPress={onRetry}
                style={styles.resendButton}
                accessible
                accessibilityLabel="Request new OTP"
                accessibilityRole="button"
              >
                <Text style={styles.resendButtonText}>Request New OTP</Text>
              </Pressable>
            )}

            {!isExpired && (
              <Pressable
                onPress={handleVerify}
                disabled={!isOtpValid || isLoading}
                style={[
                  styles.verifyButton,
                  (!isOtpValid || isLoading) && styles.verifyButtonDisabled,
                ]}
                accessible
                accessibilityLabel="Verify OTP"
                accessibilityRole="button"
              >
                <Text style={styles.verifyButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={onRetry}
            accessible
            accessibilityLabel="Change phone number"
            accessibilityRole="button"
          >
            <Text style={styles.changePhoneText}>Change phone number?</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  timerExpired: {
    color: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
  },
  resendButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginTop: 8,
  },
  resendButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changePhoneText: {
    color: '#2563eb',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});
