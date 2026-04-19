/**
 * Zustand chat store for Task 12.11
 * Manages conversations, messages, socket connection state
 */

import { create } from 'zustand';
import { ChatState, Conversation, ChatMessage } from '@/types/chat';
import logger from '@/utils/logger';

interface ChatActions {
  setConversations: (conversations: Conversation[]) => void;
  addConversations: (conversations: Conversation[]) => void;
  setCurrentChat: (chat: Conversation | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSocketConnected: (connected: boolean) => void;
  setTotalConversations: (total: number) => void;
  setCurrentPage: (page: number) => void;
  setOffline: (isOffline: boolean) => void;
  reset: () => void;
}

const initialState: ChatState = {
  conversations: [],
  currentChat: null,
  messages: [],
  loading: false,
  error: null,
  socketConnected: false,
  totalConversations: 0,
  currentPage: 1,
  pageSize: 20,
  isOffline: false,
};

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  ...initialState,

  setConversations: (conversations) => {
    logger.info('Chat conversations updated in store', {
      count: conversations.length,
    });
    set({ conversations, error: null });
  },

  addConversations: (conversations) => {
    set((state) => ({
      conversations: [...state.conversations, ...conversations],
    }));
  },

  setCurrentChat: (chat) => {
    logger.info('Current chat set in store', {
      chatId: chat?.chatId,
    });
    set({ currentChat: chat, messages: [], error: null });
  },

  setMessages: (messages) => {
    logger.info('Chat messages updated in store', {
      count: messages.length,
    });
    set({ messages, error: null });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    if (error) {
      logger.error('Chat store error', { error });
    }
    set({ error });
  },

  setSocketConnected: (connected) => {
    logger.info('Chat socket connection state', { connected });
    set({ socketConnected: connected });
  },

  setTotalConversations: (total) => {
    set({ totalConversations: total });
  },

  setCurrentPage: (page) => {
    logger.debug('Chat current page set', { page });
    set({ currentPage: page });
  },

  setOffline: (isOffline) => {
    if (isOffline) {
      logger.warn('Chat store offline mode enabled');
    }
    set({ isOffline });
  },

  reset: () => {
    logger.info('Chat store reset');
    set(initialState);
  },
}));
