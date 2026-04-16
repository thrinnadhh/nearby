import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

export interface MessageBubbleProps {
  senderType: 'customer' | 'shop';
  body: string;
  createdAt: string;
  shopName?: string;
}

function formatTime(createdAt: string): string {
  const date = new Date(createdAt);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  senderType,
  body,
  createdAt,
  shopName,
}) => {
  const isCustomer = senderType === 'customer';
  const bubbleStyle = isCustomer ? styles.bubbleCustomer : styles.bubbleShop;
  const textStyle = isCustomer ? styles.textCustomer : styles.textShop;

  return (
    <View style={[styles.container, isCustomer ? styles.containerCustomer : styles.containerShop]}>
      <View style={bubbleStyle}>
        {!isCustomer && shopName && (
          <Text style={styles.senderName}>{shopName}</Text>
        )}
        <Text style={textStyle}>{body}</Text>
        <Text style={styles.timestamp}>{formatTime(createdAt)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
  },
  containerCustomer: {
    justifyContent: 'flex-end',
  },
  containerShop: {
    justifyContent: 'flex-start',
  },
  bubbleCustomer: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginLeft: '20%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '80%',
  },
  bubbleShop: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginRight: '20%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '80%',
  },
  textCustomer: {
    color: colors.white,
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.xs,
  },
  textShop: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.xs,
  },
  senderName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    marginBottom: spacing.xs,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    marginTop: spacing.xs,
  },
});
