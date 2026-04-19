/**
 * EarningsEmptyState component
 * Displayed when there is no earnings data available
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface EarningsEmptyStateProps {
  reason?: 'noData' | 'offline' | 'error';
  testID?: string;
}

export function EarningsEmptyState({
  reason = 'noData',
  testID,
}: EarningsEmptyStateProps) {
  const messages = {
    noData: {
      title: 'No Earnings Yet',
      description: 'Complete your first order to see earnings data here.',
      icon: 'trending-up' as const,
    },
    offline: {
      title: 'You Are Offline',
      description: 'Check your internet connection to load earnings data.',
      icon: 'cloud-off' as const,
    },
    error: {
      title: 'Unable to Load Earnings',
      description: 'Something went wrong. Please try again.',
      icon: 'error-outline' as const,
    },
  };

  const message = messages[reason];

  return (
    <View style={styles.container} testID={testID}>
      <MaterialIcons
        name={message.icon}
        size={48}
        color='#D1D5DB'
        style={styles.icon}
      />
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.description}>{message.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
