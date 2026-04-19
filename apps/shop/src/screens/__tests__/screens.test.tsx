/**
 * Analytics, Chat, and Statement Screen tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AnalyticsScreen from '@/screens/AnalyticsScreen';
import ChatInboxScreen from '@/screens/ChatInboxScreen';
import ChatDetailScreen from '@/screens/ChatDetailScreen';
import MonthlyStatementScreen from '@/screens/MonthlyStatementScreen';
import { useShopAnalytics } from '@/hooks/useShopAnalytics';
import { useChat } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useStatementGenerator } from '@/hooks/useStatementGenerator';
import { useAuthStore } from '@/store/auth';

jest.mock('@/hooks/useShopAnalytics');
jest.mock('@/hooks/useChat');
jest.mock('@/hooks/useChatSocket');
jest.mock('@/hooks/useStatementGenerator');

const mockUseShopAnalytics = useShopAnalytics as jest.MockedFunction<typeof useShopAnalytics>;
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;
const mockUseChatSocket = useChatSocket as jest.MockedFunction<typeof useChatSocket>;
const mockUseStatementGenerator = useStatementGenerator as jest.MockedFunction<typeof useStatementGenerator>;

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ shopId: '123' });
  });

  it('should render without crash', () => {
    mockUseShopAnalytics.mockReturnValue({
      data: null,
      topProducts: [],
      loading: false,
      error: null,
      dateRange: '30d',
      isOffline: false,
      fetchAnalytics: jest.fn(),
      retry: jest.fn(),
    });

    const { getByTestId } = render(<AnalyticsScreen />);
    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('should display analytics data when loaded', () => {
    mockUseShopAnalytics.mockReturnValue({
      data: {
        today: { views: 100, orders: 5, revenuePaise: 50000 },
        week: [{ views: 600, orders: 30, revenuePaise: 300000 }],
        month: [{ views: 2400, orders: 120, revenuePaise: 1200000 }],
        topProducts: [],
      },
      topProducts: [],
      loading: false,
      error: null,
      dateRange: '30d',
      isOffline: false,
      fetchAnalytics: jest.fn(),
      retry: jest.fn(),
    });

    render(<AnalyticsScreen />);
    
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('should display error banner when error occurs', () => {
    mockUseShopAnalytics.mockReturnValue({
      data: null,
      topProducts: [],
      loading: false,
      error: 'Failed to load analytics',
      dateRange: '30d',
      isOffline: false,
      fetchAnalytics: jest.fn(),
      retry: jest.fn(),
    });

    const { getByTestId } = render(<AnalyticsScreen />);
    expect(getByTestId('retry-button')).toBeTruthy();
  });

  it('should handle date range change', () => {
    const fetchAnalytics = jest.fn();
    mockUseShopAnalytics.mockReturnValue({
      data: {
        today: { views: 100, orders: 5, revenuePaise: 50000 },
        week: [],
        month: [],
        topProducts: [],
      },
      topProducts: [],
      loading: false,
      error: null,
      dateRange: '30d',
      isOffline: false,
      fetchAnalytics,
      retry: jest.fn(),
    });

    const { getByTestId } = render(<AnalyticsScreen />);
    const rangeButton = getByTestId('range-90d');
    
    fireEvent.press(rangeButton);
    
    expect(fetchAnalytics).toHaveBeenCalledWith('90d');
  });

  it('should show offline banner when offline', () => {
    mockUseShopAnalytics.mockReturnValue({
      data: null,
      topProducts: [],
      loading: false,
      error: null,
      dateRange: '30d',
      isOffline: true,
      fetchAnalytics: jest.fn(),
      retry: jest.fn(),
    });

    render(<AnalyticsScreen />);
    
    expect(screen.getByText(/offline/i)).toBeTruthy();
  });
});

describe('ChatInboxScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ shopId: '123' });
  });

  it('should render conversations list', () => {
    mockUseChat.mockReturnValue({
      conversations: [
        {
          chatId: '1',
          customerId: 'cust1',
          customerName: 'John Doe',
          lastMessage: 'Hello',
          lastMessageTime: new Date().toISOString(),
          messageCount: 5,
          unreadCount: 1,
        },
      ],
      currentChat: null,
      messages: [],
      loading: false,
      error: null,
      isOffline: false,
      totalConversations: 1,
      currentPage: 1,
      pageSize: 20,
      fetchConversations: jest.fn(),
      openChat: jest.fn(),
      retry: jest.fn(),
    });

    const { getByText } = render(<ChatInboxScreen />);
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('should display empty state when no conversations', () => {
    mockUseChat.mockReturnValue({
      conversations: [],
      currentChat: null,
      messages: [],
      loading: false,
      error: null,
      isOffline: false,
      totalConversations: 0,
      currentPage: 1,
      pageSize: 20,
      fetchConversations: jest.fn(),
      openChat: jest.fn(),
      retry: jest.fn(),
    });

    const { getByText } = render(<ChatInboxScreen />);
    expect(getByText(/No conversations yet/i)).toBeTruthy();
  });

  it('should call onSelectChat when conversation is selected', () => {
    const onSelectChat = jest.fn();
    const conversation = {
      chatId: '1',
      customerId: 'cust1',
      customerName: 'John Doe',
      lastMessage: 'Hello',
      lastMessageTime: new Date().toISOString(),
      messageCount: 5,
      unreadCount: 1,
    };

    mockUseChat.mockReturnValue({
      conversations: [conversation],
      currentChat: null,
      messages: [],
      loading: false,
      error: null,
      isOffline: false,
      totalConversations: 1,
      currentPage: 1,
      pageSize: 20,
      fetchConversations: jest.fn(),
      openChat: jest.fn(),
      retry: jest.fn(),
    });

    const { getByTestId } = render(
      <ChatInboxScreen onSelectChat={onSelectChat} />
    );
    
    const conversationItem = getByTestId('conversation-1');
    fireEvent.press(conversationItem);
    
    expect(onSelectChat).toHaveBeenCalledWith(conversation);
  });
});

describe('ChatDetailScreen', () => {
  const mockConversation = {
    chatId: '1',
    customerId: 'cust1',
    customerName: 'John Doe',
    lastMessage: 'Hello',
    lastMessageTime: new Date().toISOString(),
    messageCount: 5,
    unreadCount: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ shopId: '123' });
  });

  it('should render messages', () => {
    mockUseChat.mockReturnValue({
      conversations: [],
      currentChat: mockConversation,
      messages: [
        {
          messageId: 'msg1',
          senderType: 'customer',
          body: 'Hello from customer',
          createdAt: new Date().toISOString(),
          isRead: true,
        },
      ],
      loading: false,
      error: null,
      isOffline: false,
      totalConversations: 0,
      currentPage: 1,
      pageSize: 20,
      fetchConversations: jest.fn(),
      openChat: jest.fn(),
      retry: jest.fn(),
    });

    mockUseChatSocket.mockReturnValue({
      socketConnected: true,
      sendMessage: jest.fn(),
      reconnect: jest.fn(),
    });

    const { getByText } = render(
      <ChatDetailScreen conversation={mockConversation} />
    );
    
    expect(getByText('Hello from customer')).toBeTruthy();
  });

  it('should send message when send button is pressed', () => {
    const sendMessage = jest.fn();
    
    mockUseChat.mockReturnValue({
      conversations: [],
      currentChat: mockConversation,
      messages: [],
      loading: false,
      error: null,
      isOffline: false,
      totalConversations: 0,
      currentPage: 1,
      pageSize: 20,
      fetchConversations: jest.fn(),
      openChat: jest.fn(),
      retry: jest.fn(),
    });

    mockUseChatSocket.mockReturnValue({
      socketConnected: true,
      sendMessage,
      reconnect: jest.fn(),
    });

    const { getByTestId } = render(
      <ChatDetailScreen conversation={mockConversation} />
    );
    
    const input = getByTestId('message-input');
    fireEvent.changeText(input, 'Test message');
    
    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);
    
    expect(sendMessage).toHaveBeenCalled();
  });
});

describe('MonthlyStatementScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ shopId: '123' });
  });

  it('should render month/year selector', () => {
    mockUseStatementGenerator.mockReturnValue({
      loading: false,
      error: null,
      pdfUrl: null,
      fileName: null,
      generatePdf: jest.fn(),
      downloadPdf: jest.fn(),
      sharePdf: jest.fn(),
      reset: jest.fn(),
    });

    const { getByTestId } = render(<MonthlyStatementScreen />);
    expect(getByTestId('month-picker')).toBeTruthy();
    expect(getByTestId('year-picker')).toBeTruthy();
  });

  it('should call generatePdf when generate button is pressed', () => {
    const generatePdf = jest.fn();
    
    mockUseStatementGenerator.mockReturnValue({
      loading: false,
      error: null,
      pdfUrl: null,
      fileName: null,
      generatePdf,
      downloadPdf: jest.fn(),
      sharePdf: jest.fn(),
      reset: jest.fn(),
    });

    const { getByTestId } = render(<MonthlyStatementScreen />);
    
    const generateButton = getByTestId('generate-button');
    fireEvent.press(generateButton);
    
    expect(generatePdf).toHaveBeenCalled();
  });

  it('should show success state after PDF generation', () => {
    mockUseStatementGenerator.mockReturnValue({
      loading: false,
      error: null,
      pdfUrl: 'file://path/to/pdf',
      fileName: 'statement.pdf',
      generatePdf: jest.fn(),
      downloadPdf: jest.fn(),
      sharePdf: jest.fn(),
      reset: jest.fn(),
    });

    const { getByText, getByTestId } = render(<MonthlyStatementScreen />);
    expect(getByText('Statement Ready')).toBeTruthy();
    expect(getByTestId('download-button')).toBeTruthy();
    expect(getByTestId('share-button')).toBeTruthy();
  });

  it('should display error when PDF generation fails', () => {
    mockUseStatementGenerator.mockReturnValue({
      loading: false,
      error: 'Failed to generate PDF',
      pdfUrl: null,
      fileName: null,
      generatePdf: jest.fn(),
      downloadPdf: jest.fn(),
      sharePdf: jest.fn(),
      reset: jest.fn(),
    });

    const { getByText } = render(<MonthlyStatementScreen />);
    expect(getByText('Failed to generate PDF')).toBeTruthy();
  });
});
