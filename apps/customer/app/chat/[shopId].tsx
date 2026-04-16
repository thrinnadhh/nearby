import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { getShop } from '@/services/shops';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatInput } from '@/components/ChatInput';
import {
  joinShopChat,
  leaveShopChat,
  sendMessage,
  onNewMessage,
  onChatError,
} from '@/services/socket';
import logger from '@/utils/logger';
import type { ShopDetail } from '@/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export default function ChatScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.userId);

  const { messages, loading, error, setMessages, addMessage, setLoading, setError, clearMessages } =
    useChatStore();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Guard: validate UUID ─────────────────────────────────────────────
  useEffect(() => {
    if (!isValidUUID(shopId)) {
      Alert.alert('Error', 'Invalid shop ID', [{ text: 'Go Back', onPress: () => router.back() }]);
      return;
    }

    // Load shop details
    (async () => {
      try {
        const shopData = await getShop(shopId, token!);
        setShop(shopData);
      } catch (err) {
        logger.error('Failed to load shop', { error: err instanceof Error ? err.message : err });
      }
    })();
  }, [shopId, token]);

  // ─── Socket.IO: Join chat room and listen for events ───────────────────
  useEffect(() => {
    if (!shopId || !isValidUUID(shopId)) return;

    // Join chat room
    (async () => {
      try {
        setLoading(true);
        await joinShopChat(shopId);
        // TODO: Fetch chat history from backend if endpoint is available
        // For now, messages come in via Socket.IO in real-time
        setLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join chat';
        setError(message);
        logger.error('Failed to join chat', { error: message });
        setLoading(false);
      }
    })();

    // Subscribe to new messages
    const unsubscribeNewMessage = onNewMessage((message) => {
      addMessage(message);
    });

    // Subscribe to chat errors
    const unsubscribeChatError = onChatError((error) => {
      setError(error.message);
    });

    // Cleanup
    return () => {
      unsubscribeNewMessage();
      unsubscribeChatError();
      leaveShopChat(shopId);
      clearMessages();
    };
  }, [shopId]);

  // ─── Handle sending messages ───────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (body: string) => {
      if (!shopId || !isValidUUID(shopId)) {
        Alert.alert('Error', 'Invalid shop');
        return;
      }

      if (!body.trim() || body.length > 2000) {
        Alert.alert('Error', 'Message must be 1-2000 characters');
        return;
      }

      setSending(true);
      try {
        await sendMessage(shopId, body);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        Alert.alert('Error', message);
      } finally {
        setSending(false);
      }
    },
    [shopId]
  );

  // ─── Refresh handler ───────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Implement message history refresh if backend endpoint available
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{shop?.name || 'Chat'}</Text>
          <Text style={styles.headerStatus}>
            {shop?.is_open ? '🟢 Open' : '🔴 Closed'}
          </Text>
        </View>
      </View>

      {/* Messages List */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {messages.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="chatbubble-outline" size={48} color={colors.lightGray} />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with {shop?.name}</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              senderType={item.senderType}
              body={item.body}
              createdAt={item.createdAt}
              shopName={item.senderType === 'shop' ? shop?.name : undefined}
            />
          )}
          inverted
          contentContainerStyle={styles.messagesList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      {/* Input */}
      <ChatInput onSend={handleSendMessage} sending={sending} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.dark,
  },
  headerStatus: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorBanner: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontFamily: fontFamily.regular,
  },
  messagesList: {
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.dark,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
});
