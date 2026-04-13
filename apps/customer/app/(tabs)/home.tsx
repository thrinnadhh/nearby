import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontFamily } from '@/constants/theme';

// Placeholder: shop grid with Typesense geo-search implemented in Sprint 7.6
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Home Screen</Text>
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
