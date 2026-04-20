/**
 * useChat hook for Task 12.11
 * Fetches conversations list with pagination
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getConversations, getMessages } from '@/services/chat';
import { Conversation, ChatMessage } from '@/types/chat';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseChatResult {
  conversations: Conversation[];
  currentChat: Conversation | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  totalConversations: number;
  currentPage: number;
  pageSize: number;
  fetchConversations: (page?: number, search?: string) => Promise<void>;
  openChat: (conversation: Conversation) => Promise<void>;
  retry: () => Promise<void>;
}

export function useChat(): UseChatResult {
  const shopId = useAuthStore((s) => s.shopId);
  const isConnected = useNetworkStatus();

  // Individual selectors
  const conversations = useChatStore((s) => s.conversations);
  const currentChat = useChatStore((s) => s.currentChat);
  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const error = useChatStore((s) => s.error);
  const isOffline = useChatStore((s) => s.isOffline);
  const totalConversations = useChatStore((s) => s.totalConversations);
  const currentPage = useChatStore((s) => s.currentPage);
  const pageSize = useChatStore((s) => s.pageSize);

  const setConversations = useChatStore((s) => s.setConversations);
  const setCurrentChat = useChatStore((s) => s.setCurrentChat);
  const setMessages = useChatStore((s) => s.setMessages);
  const setLoading = useChatStore((s) => s.setLoading);
  const setError = useChatStore((s) => s.setError);
  const setOffline = useChatStore((s) => s.setOffline);
  const setTotalConversations = useChatStore((s) => s.setTotalConversations);
  const setCurrentPage = useChatStore((s) => s.setCurrentPage);

  const [shouldFetch, setShouldFetch] = useState(false);
  const [lastSearch, setLastSearch] = useState<string | undefined>();

  // Track network status
  useEffect(() => {
    setOffline(!isConnected);
  }, [isConnected, setOffline]);

  // Fetch on mount if not already loaded
  useEffect(() => {
    if (shopId && conversations.length === 0 && !loading && !error) {
      setShouldFetch(true);
    }
  }, [shopId, conversations.length, loading, error]);

  const fetchConversations = useCallback(
    async (page: number = 1, search?: string) => {
      if (!shopId) {
        logger.warn('shopId not available for chat fetch');
        setError('Shop ID not found');
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentPage(page);

      try {
        const { conversations: convs, meta } = await getConversations(
          shopId,
          page,
          pageSize,
          search
        );

        setConversations(convs);
        setTotalConversations(meta.total);
        setLastSearch(search);

        logger.info('Conversations fetched successfully', {
          shopId,
          page,
          total: meta.total,
          returned: convs.length,
        });
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : (err as Error)?.message ?? 'Failed to fetch conversations';
        setError(message);
        logger.error('Conversations fetch failed', {
          shopId,
          error: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [
      shopId,
      pageSize,
      setConversations,
      setLoading,
      setError,
      setTotalConversations,
      setCurrentPage,
    ]
  );

  const openChat = useCallback(
    async (conversation: Conversation) => {
      if (!shopId) {
        logger.warn('shopId not available for opening chat');
        return;
      }

      setCurrentChat(conversation);
      setLoading(true);
      setError(null);

      try {
        const { messages: msgs } = await getMessages(
          shopId,
          conversation.customerId,
          1,
          50
        );

        setMessages(msgs);

        logger.info('Chat messages fetched', {
          shopId,
          customerId: conversation.customerId,
          messageCount: msgs.length,
        });
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : (err as Error)?.message ?? 'Failed to fetch messages';
        setError(message);
        logger.error('Messages fetch failed', {
          shopId,
          customerId: conversation.customerId,
          error: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [shopId, setCurrentChat, setMessages, setLoading, setError]
  );

  const retry = useCallback(() => {
    fetchConversations(currentPage, lastSearch);
  }, [fetchConversations, currentPage, lastSearch]);

  // Initial fetch
  useEffect(() => {
    if (shouldFetch) {
      fetchConversations(1);
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchConversations]);

  return {
    conversations,
    currentChat,
    messages,
    loading,
    error,
    isOffline,
    totalConversations,
    currentPage,
    pageSize,
    fetchConversations,
    openChat,
    retry,
  };
}
