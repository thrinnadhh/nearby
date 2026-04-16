import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

/**
 * Profile Edit Screen (Task 10.6)
 * 
 * Stub for editing profile information.
 * Currently read-only. Full implementation (name, email editing) requires:
 * - Backend schema changes to support name/email fields
 * - RLS policy updates for profile editing
 * - Planned for Phase 3
 * 
 * See ADR-TBD for design decisions on profile information collection.
 */

export default function EditProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="chevron-back"
          size={24}
          color={colors.primary}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="lock" size={40} color={colors.textTertiary} />
          <Text style={styles.message}>Profile editing</Text>
          <Text style={styles.description}>
            This feature is coming soon. Currently, your profile information is read-only.
          </Text>
          <Text style={styles.note}>
            To update your phone number, please contact support.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  note: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
