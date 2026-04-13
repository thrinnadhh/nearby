import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { sendOtp } from '@/services/auth';

const INDIA_CODE = '+91';

function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendOtp(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Logo / Brand */}
        <View style={styles.header}>
          <Text style={styles.brand}>NearBy</Text>
          <Text style={styles.tagline}>Your neighbourhood, delivered.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Enter your mobile number</Text>
          <Text style={styles.subtitle}>
            We'll send a 6-digit OTP to verify your number.
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.countryBox}>
              <Text style={styles.countryCode}>{INDIA_CODE}</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={(t) => {
                // Only allow digits, max 10 chars
                const digits = t.replace(/\D/g, '').slice(0, 10);
                setPhone(digits);
                if (error) setError(null);
              }}
              placeholder="98765 43210"
              placeholderTextColor={colors.textDisabled}
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Send OTP"
            fullWidth
            loading={loading}
            disabled={phone.length !== 10}
            onPress={handleSendOtp}
            style={styles.button}
          />
        </View>

        {/* Footer */}
        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
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
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
    paddingTop: spacing.massive * 2,
  },
  header: { alignItems: 'center' },
  brand: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: { gap: spacing.md },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  countryBox: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
    backgroundColor: colors.background,
  },
  countryCode: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  error: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
  },
  button: { marginTop: spacing.sm },
  terms: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    fontFamily: fontFamily.medium,
  },
});
