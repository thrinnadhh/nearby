import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  shopId: string;
  customerId: string | null;
  orderId: string | null;
  senderType: 'customer' | 'shop';
  body: string;
  createdAt: string;
}

export interface ChatStore {
  // State
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  activeShopId: string | null;

  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveShop: (shopId: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  loading: false,
  error: null,
  activeShopId: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [], error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setActiveShop: (shopId) => set({ activeShopId: shopId }),
}));
