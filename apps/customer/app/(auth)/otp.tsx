import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { verifyOtp, sendOtp } from '@/services/auth';
import { useAuthStore } from '@/store/auth';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const login = useAuthStore((s) => s.login);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const focusNext = (index: number) => {
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const focusPrev = (index: number) => {
    if (index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1); // single digit only
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (error) setError(null);
    if (digit) focusNext(index);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index]) focusPrev(index);
  };

  const otpValue = digits.join('');
  const isComplete = otpValue.length === OTP_LENGTH;

  const handleVerify = useCallback(async () => {
    if (!isComplete || !phone) return;
    setLoading(true);
    setError(null);
    try {
      const data = await verifyOtp(phone, otpValue);
      login({ userId: data.userId, phone: data.phone, token: data.token });
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
      // Clear digits so user re-enters
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [isComplete, phone, otpValue, login]);

  // Auto-submit when all digits filled
  useEffect(() => {
    if (isComplete) handleVerify();
  }, [isComplete, handleVerify]);

  async function handleResend() {
    if (resendTimer > 0 || !phone) return;
    try {
      await sendOtp(phone);
      setDigits(Array(OTP_LENGTH).fill(''));
      setError(null);
      setResendTimer(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            Sent to {'\u200E'}+91 {phone}
          </Text>

          {/* 6-box input */}
          <View style={styles.boxRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputRefs.current[i] = r;
                }}
                style={[styles.box, digit ? styles.boxFilled : null]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, i)
                }
                keyboardType="number-pad"
                maxLength={1}
                textContentType="oneTimeCode"
                autoFocus={i === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Verify"
            fullWidth
            loading={loading}
            disabled={!isComplete}
            onPress={handleVerify}
            style={styles.button}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive it? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0}
            >
              <Text
                style={[
                  styles.resendLink,
                  resendTimer > 0 && styles.resendDisabled,
                ]}
              >
                {resendTimer > 0
                  ? `Resend in ${resendTimer}s`
                  : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Android SMS auto-read note */}
          {Platform.OS === 'android' && (
            <Text style={styles.hint}>
              OTP will be filled automatically if SMS permissions are granted.
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  back: { marginBottom: spacing.xxl },
  backText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  content: { gap: spacing.lg },
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  error: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    textAlign: 'center',
  },
  button: { marginTop: spacing.xs },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  resendDisabled: {
    color: colors.textDisabled,
  },
  hint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 16,
  },
});
