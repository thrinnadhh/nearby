/**
 * ChatDetailScreen for Task 12.11
 * Message view for a specific conversation
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useChat } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useAuthStore } from '@/store/auth';
import { Conversation, SendMessageData } from '@/types/chat';
import logger from '@/utils/logger';

interface ChatDetailScreenProps {
  conversation: Conversation;
  onBack?: () => void;
}

export default function ChatDetailScreen({
  conversation,
  onBack,
}: ChatDetailScreenProps) {
  const shopId = useAuthStore((s) => s.shopId);
  const { messages, loading, error } = useChat();
  const { socketConnected, sendMessage } = useChatSocket(shopId);

  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !shopId || !socketConnected) {
      if (!socketConnected) {
        logger.warn('Socket not connected, cannot send message');
      }
      return;
    }

    setSendingMessage(true);
    const text = messageText.trim();
    setMessageText('');

    try {
      const messageData: SendMessageData = {
        shopId,
        customerId: conversation.customerId,
        body: text,
      };

      sendMessage(messageData);
      logger.info('Message sent', {
        customerId: conversation.customerId,
      });
    } catch (err) {
      logger.error('Send message failed', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
      setMessageText(text); // Restore text on error
    } finally {
      setSendingMessage(false);
    }
  }, [messageText, shopId, socketConnected, conversation.customerId, sendMessage]);

  const handleBack = useCallback(() => {
    logger.info('Back from chat detail');
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} testID='back-button'>
            <MaterialIcons name='arrow-back' size={24} color='#111827' />
          </TouchableOpacity>
          <Text style={styles.customerName}>{conversation.customerName}</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#3B82F6' />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} testID='back-button'>
            <MaterialIcons name='arrow-back' size={24} color='#111827' />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.customerName}>{conversation.customerName}</Text>
            <Text style={styles.connectionStatus}>
              {socketConnected ? (
                <Text style={styles.connectedText}>● Connected</Text>
              ) : (
                <Text style={styles.disconnectedText}>● Disconnected</Text>
              )}
            </Text>
          </View>
          <View style={styles.spacer} />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <MaterialIcons name='error' size={16} color='#DC2626' />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.messageId}
          renderItem={({ item }) => {
            const isFromShop = item.senderType === 'shop';
            return (
              <View
                style={[
                  styles.messageContainer,
                  isFromShop ? styles.messageFromShop : styles.messageFromCustomer,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isFromShop ? styles.bubbleFromShop : styles.bubbleFromCustomer,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isFromShop ? styles.messageTextShop : styles.messageTextCustomer,
                    ]}
                  >
                    {item.body}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isFromShop ? styles.messageTimeShop : styles.messageTimeCustomer,
                    ]}
                  >
                    {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          }}
          inverted
          testID='messages-list'
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder='Type a message...'
            placeholderTextColor='#9CA3AF'
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={2000}
            editable={socketConnected}
            testID='message-input'
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!socketConnected || sendingMessage) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!socketConnected || sendingMessage || !messageText.trim()}
            testID='send-button'
          >
            {sendingMessage ? (
              <ActivityIndicator size='small' color='#FFFFFF' />
            ) : (
              <MaterialIcons name='send' size={20} color='#FFFFFF' />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  connectionStatus: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  connectedText: {
    color: '#10B981',
    fontWeight: '500',
  },
  disconnectedText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  spacer: {
    width: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
  },
  messageFromShop: {
    justifyContent: 'flex-start',
  },
  messageFromCustomer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bubbleFromShop: {
    backgroundColor: '#F3F4F6',
  },
  bubbleFromCustomer: {
    backgroundColor: '#3B82F6',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextShop: {
    color: '#111827',
  },
  messageTextCustomer: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  messageTimeShop: {
    color: '#6B7280',
  },
  messageTimeCustomer: {
    color: '#DBEAFE',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
