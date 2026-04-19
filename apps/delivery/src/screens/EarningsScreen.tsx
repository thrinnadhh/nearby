/**
 * EarningsScreen — tab showing earnings and statistics (Task 13.1)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePartnerStore } from '@/store/partner';

export function EarningsScreen() {
  const { profile } = usePartnerStore();

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
      </View>

      {/* Today's Earnings */}
      <View style={styles.card}>
        <Text style={styles.label}>Today</Text>
        <Text style={styles.amount}>₹{profile.earningsToday.toFixed(2)}</Text>
      </View>

      {/* Total Earnings */}
      <View style={styles.card}>
        <Text style={styles.label}>Total Earnings</Text>
        <Text style={styles.amount}>₹{profile.earningsTotal.toFixed(2)}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Completed Deliveries</Text>
          <Text style={styles.statValue}>{profile.completedDeliveries}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Average Rating</Text>
          <Text style={styles.statValue}>{profile.rating.toFixed(1)} ⭐</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  statRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
