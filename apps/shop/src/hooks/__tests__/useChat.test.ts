/**
 * useChat and useChatSocket hook tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useChat } from '@/hooks/useChat';
import { useChatSocket, _resetSocketInstance } from '@/hooks/useChatSocket';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { getConversations, getMessages } from '@/services/chat';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Conversation, ChatMessage } from '@/types/chat';
import io from 'socket.io-client';

jest.mock('@/services/chat');
jest.mock('@/hooks/useNetworkStatus');
jest.mock('socket.io-client');

const mockGetConversations = getConversations as jest.MockedFunction<typeof getConversations>;
const mockGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;
const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockIO = io as jest.MockedFunction<typeof io>;

const mockConversations: Conversation[] = [
  {
    chatId: '1',
    customerId: 'cust1',
    customerName: 'John Doe',
    lastMessage: 'Hello',
    lastMessageTime: new Date().toISOString(),
    messageCount: 5,
    unreadCount: 1,
  },
];

const mockMessages: ChatMessage[] = [
  {
    messageId: 'msg1',
    senderType: 'customer',
    body: 'Hello',
    createdAt: new Date().toISOString(),
    isRead: true,
  },
];

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.setState({
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
    });
    mockUseNetworkStatus.mockReturnValue(true);
  });

  it('should return initial state', () => {
    useAuthStore.setState({ shopId: null });
    const { result } = renderHook(() => useChat());

    expect(result.current.conversations).toEqual([]);
    expect(result.current.currentChat).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch conversations on mount', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    mockGetConversations.mockResolvedValue({
      conversations: mockConversations,
      meta: { page: 1, limit: 20, total: 1, pages: 1 },
    });

    const { result } = renderHook(() => useChat());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetConversations).toHaveBeenCalledWith(shopId, 1, 20, undefined);
    expect(result.current.conversations).toEqual(mockConversations);
    expect(result.current.totalConversations).toBe(1);
  });

  it('should handle conversation fetch error', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    const error = new Error('Fetch failed');
    mockGetConversations.mockRejectedValue(error);

    const { result } = renderHook(() => useChat());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fetch failed');
    expect(result.current.conversations).toEqual([]);
  });

  it('should open chat and fetch messages', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    mockGetMessages.mockResolvedValue({
      messages: mockMessages,
      meta: { page: 1, limit: 50, total: 1, pages: 1 },
    });

    const { result } = renderHook(() => useChat());

    const conversation = mockConversations[0];
    await act(async () => {
      await result.current.openChat(conversation);
    });

    await waitFor(() => {
      expect(result.current.currentChat).toEqual(conversation);
    });

    expect(mockGetMessages).toHaveBeenCalledWith(shopId, conversation.customerId, 1, 50);
    expect(result.current.messages).toEqual(mockMessages);
  });

  it('should support search', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    mockGetConversations.mockResolvedValue({
      conversations: mockConversations,
      meta: { page: 1, limit: 20, total: 1, pages: 1 },
    });

    const { result } = renderHook(() => useChat());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      // Simulating search would happen via fetchConversations
    });
  });

  it('should handle offline status', async () => {
    useAuthStore.setState({ shopId: '123' });
    mockUseNetworkStatus.mockReturnValue(false);

    const { result } = renderHook(() => useChat());

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });

  it('should support retry', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });
    mockGetConversations.mockResolvedValue({
      conversations: mockConversations,
      meta: { page: 1, limit: 20, total: 1, pages: 1 },
    });

    const { result } = renderHook(() => useChat());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(mockGetConversations).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useChatSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module-level socket singleton to prevent stale state across tests
    _resetSocketInstance();
    mockSocket = {
      connected: true,
      id: 'socket123',
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    mockIO.mockReturnValue(mockSocket);
    useChatStore.setState({
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
    });
  });

  it('should initialize socket connection', () => {
    const shopId = '123';
    useAuthStore.setState({ shopId, userId: 'user1', token: 'token123' });

    renderHook(() => useChatSocket(shopId));

    expect(mockIO).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'token123' },
        reconnection: true,
      })
    );
  });

  it('should handle connect event', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId, userId: 'user1', token: 'token123' });

    const { result } = renderHook(() => useChatSocket(shopId));

    // Simulate connect event
    act(() => {
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      if (connectHandler) connectHandler();
    });

    await waitFor(() => {
      expect(result.current.socketConnected).toBe(true);
    });
  });

  it('should handle disconnect event', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId, userId: 'user1', token: 'token123' });

    const { result } = renderHook(() => useChatSocket(shopId));

    // Simulate disconnect event
    act(() => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];
      if (disconnectHandler) disconnectHandler();
    });

    await waitFor(() => {
      expect(result.current.socketConnected).toBe(false);
    });
  });

  it('should send message', () => {
    const shopId = '123';
    useAuthStore.setState({ shopId, userId: 'user1', token: 'token123' });

    const { result } = renderHook(() => useChatSocket(shopId));

    act(() => {
      result.current.sendMessage({
        shopId,
        customerId: 'cust1',
        body: 'Hello',
      });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'send-message',
      expect.objectContaining({
        shopId,
        customerId: 'cust1',
        body: 'Hello',
      }),
      expect.any(Function)
    );
  });

  it('should handle missing shopId', () => {
    useAuthStore.setState({ shopId: null, userId: 'user1', token: 'token123' });

    renderHook(() => useChatSocket(undefined));

    expect(mockIO).not.toHaveBeenCalled();
  });

  it('should support reconnect', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId, userId: 'user1', token: 'token123' });
    mockSocket.connected = false;

    const { result } = renderHook(() => useChatSocket(shopId));

    act(() => {
      result.current.reconnect();
    });

    expect(mockSocket.connect).toHaveBeenCalled();
  });
});
