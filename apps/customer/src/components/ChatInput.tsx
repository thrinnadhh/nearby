import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

export interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  sending?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, sending = false }) => {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    try {
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      // Error is handled by parent component
    }
  };

  const canSend = message.trim().length > 0 && !sending;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        editable={!sending}
      />
      <TouchableOpacity
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!canSend}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons name="send" size={20} color={colors.white} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    color: colors.dark,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.lightGray,
    opacity: 0.5,
  },
});
