/**
 * SettlementEmptyState component
 * Shown when no settlements exist
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SettlementEmptyStateProps {
  testID?: string;
}

export function SettlementEmptyState({ testID }: SettlementEmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <MaterialIcons
        name="receipt-long"
        size={64}
        color="#CCC"
        style={styles.icon}
      />
      <Text style={styles.title}>No Settlements Yet</Text>
      <Text style={styles.description}>
        Settlements will appear here once you have completed orders and earnings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
