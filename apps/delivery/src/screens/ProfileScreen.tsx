/**
 * ProfileScreen — tab with profile info and settings (Task 13.1)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { usePartnerStore } from '@/store/partner';

export function ProfileScreen() {
  const auth = useAuthStore();
  const { profile } = usePartnerStore();

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading profile...</Text>
      </View>
    );
  }

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profile.phone}</Text>
        </View>
      </View>

      {/* KYC Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KYC Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, getStatusColor(profile.kycStatus)]}>
            {formatStatus(profile.kycStatus)}
          </Text>
        </View>
        {profile.aadhaarLast4 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Aadhaar</Text>
            <Text style={styles.infoValue}>****{profile.aadhaarLast4}</Text>
          </View>
        )}
      </View>

      {/* Bank Details */}
      {profile.bankAccountName && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Name</Text>
            <Text style={styles.infoValue}>{profile.bankAccountName}</Text>
          </View>
          {profile.bankIFSC && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IFSC Code</Text>
              <Text style={styles.infoValue}>{profile.bankIFSC}</Text>
            </View>
          )}
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    pending_kyc: 'Pending KYC',
    pending_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] || status;
}

function getStatusColor(status: string) {
  if (status === 'approved') {
    return { color: '#22c55e' };
  }
  if (status === 'rejected') {
    return { color: '#ef4444' };
  }
  return { color: '#f59e0b' };
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
