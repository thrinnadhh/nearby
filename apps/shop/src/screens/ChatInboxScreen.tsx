/**
 * ChatInboxScreen for Task 12.11
 * List of all conversations
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useChat } from '@/hooks/useChat';
import { useAuthStore } from '@/store/auth';
import { Conversation } from '@/types/chat';
import logger from '@/utils/logger';

interface ChatInboxScreenProps {
  onSelectChat?: (conversation: Conversation) => void;
}

export default function ChatInboxScreen({ onSelectChat }: ChatInboxScreenProps) {
  const shopId = useAuthStore((s) => s.shopId);
  const {
    conversations,
    loading,
    error,
    isOffline,
    totalConversations,
    currentPage,
    pageSize,
    fetchConversations,
    retry,
  } = useChat();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchConversations(1, searchText || undefined);
    } catch (err) {
      logger.error('Refresh failed', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchConversations, searchText]);

  const handleSearch = useCallback(
    async (text: string) => {
      setSearchText(text);
      logger.info('Searching conversations', { query: text });
      await fetchConversations(1, text || undefined);
    },
    [fetchConversations]
  );

  const handleLoadMore = useCallback(() => {
    if (conversations.length < totalConversations) {
      fetchConversations(currentPage + 1, searchText || undefined);
    }
  }, [fetchConversations, conversations.length, totalConversations, currentPage, searchText]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleSelectChat = useCallback(
    (conversation: Conversation) => {
      logger.info('Selected conversation', { chatId: conversation.chatId });
      if (onSelectChat) {
        onSelectChat(conversation);
      }
    },
    [onSelectChat]
  );

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialIcons name='error' size={48} color='#EF4444' />
          <Text style={styles.emptyStateText}>Shop ID not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = conversations.length === 0 && !loading;
  const showError = error && isEmpty;
  const showOffline = isOffline && isEmpty;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {totalConversations > 0 && (
          <Text style={styles.headerSubtitle}>
            {totalConversations} {totalConversations === 1 ? 'conversation' : 'conversations'}
          </Text>
        )}
      </View>

      {showError && (
        <View style={styles.errorBanner}>
          <MaterialIcons name='error' size={20} color='#EF4444' />
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Failed to load messages</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
          <TouchableOpacity onPress={handleRetry} testID='retry-button'>
            <MaterialIcons name='refresh' size={20} color='#EF4444' />
          </TouchableOpacity>
        </View>
      )}

      {showOffline && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name='cloud-off' size={20} color='#F59E0B' />
          <Text style={styles.offlineText}>
            You are offline. Showing cached data.
          </Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <MaterialIcons name='search' size={20} color='#6B7280' />
        <TextInput
          style={styles.searchInput}
          placeholder='Search conversations'
          placeholderTextColor='#9CA3AF'
          value={searchText}
          onChangeText={handleSearch}
          testID='search-input'
        />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.chatId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => handleSelectChat(item)}
            testID={`conversation-${item.chatId}`}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.customerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.conversationInfo}>
              <Text style={styles.customerName} numberOfLines={1}>
                {item.customerName}
              </Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage}
              </Text>
              <Text style={styles.messageCount}>
                {item.messageCount} {item.messageCount === 1 ? 'message' : 'messages'}
              </Text>
            </View>

            <View style={styles.messageTimestamp}>
              <Text style={styles.timestamp}>
                {new Date(item.lastMessageTime).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              {item.unreadCount > 0 && (
                <MaterialIcons name='chevron-right' size={24} color='#3B82F6' />
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isEmpty ? (
            <View style={styles.emptyState}>
              <MaterialIcons name='mail-outline' size={48} color='#D1D5DB' />
              <Text style={styles.emptyStateText}>No conversations yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start chatting with customers
              </Text>
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorMessage: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    color: '#111827',
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  conversationInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  messageCount: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  messageTimestamp: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
});
