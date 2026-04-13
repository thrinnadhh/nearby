import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontFamily } from '@/constants/theme';

// Placeholder: full phone entry + OTP flow implemented in Sprint 7.3
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Login Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  label: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
});
