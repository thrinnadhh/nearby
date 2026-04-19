/**
 * Chat types for Task 12.11
 */

export interface ChatMessage {
  messageId: string;
  senderType: 'customer' | 'shop';
  body: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  chatId: string;
  customerId: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  unreadCount: number;
}

export interface ChatData {
  conversations: Conversation[];
  currentChat: Conversation | null;
  messages: ChatMessage[];
  totalConversations: number;
  currentPage: number;
}

export interface ChatSocketEvents {
  'send-message': (data: SendMessageData) => void;
  'receive-message': (message: ChatMessage) => void;
  'message-error': (error: SocketError) => void;
  connect: () => void;
  disconnect: () => void;
}

export interface SendMessageData {
  shopId: string;
  customerId?: string;
  orderId?: string;
  body: string;
}

export interface SocketError {
  code: string;
  message: string;
}

export interface ChatState {
  conversations: Conversation[];
  currentChat: Conversation | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  socketConnected: boolean;
  totalConversations: number;
  currentPage: number;
  pageSize: number;
  isOffline: boolean;
}
