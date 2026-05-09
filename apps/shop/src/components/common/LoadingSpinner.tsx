/**
 * LoadingSpinner — simple centered activity indicator
 */
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  testID?: string;
}

export function LoadingSpinner({ size = 'large', color = colors.primary, testID = 'loading-spinner' }: Props) {
  return (
    <View style={styles.container} testID={testID}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
