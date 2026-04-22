/**
 * Assignment notification banner — shows pending assignment count and status
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useAssignmentStore } from '@/store/assignment';

interface AssignmentNotificationBannerProps {
  onPress?: () => void;
  isCollapsed?: boolean;
}

export function AssignmentNotificationBanner({
  onPress,
  isCollapsed = false,
}: AssignmentNotificationBannerProps): React.ReactElement | null {
  const pendingCount = useAssignmentStore(
    (state) => state.pendingAssignments.length
  );
  const isListening = useAssignmentStore((state) => state.isListening);
  const error = useAssignmentStore((state) => state.error);

  if (!isListening && !error && pendingCount === 0) {
    return null;
  }

  const backgroundColor = error ? '#dc2626' : '#2563eb';
  const message = error
    ? error
    : isListening
      ? `${pendingCount} assignment${pendingCount !== 1 ? 's' : ''} available`
      : 'Connecting...';

  const accessibilityLabel = `${message}. ${onPress ? 'Double tap to view assignments' : ''}`;

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[styles.banner, { backgroundColor }]}
    >
      <View style={styles.content}>
        <Text
          style={styles.message}
          numberOfLines={1}
          accessibilityLabel={message}
        >
          {message}
        </Text>
        {pendingCount > 0 && (
          <View
            style={styles.badge}
            accessible
            accessibilityLabel={`${pendingCount} pending assignments`}
          >
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
