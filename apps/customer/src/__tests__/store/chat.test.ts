import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useChatStore } from '@/store/chat';
import type { ChatMessage } from '@/store/chat';

describe('Chat Store (Zustand)', () => {
  beforeEach(() => {
    // Reset store before each test
    useChatStore.setState({
      messages: [],
      loading: false,
      error: null,
      activeShopId: null,
    });
  });

  it('should initialize with empty state', () => {
    const store = useChatStore.getState();
    expect(store.messages).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.activeShopId).toBeNull();
  });

  it('should add messages', () => {
    const message: ChatMessage = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      shopId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: null,
      senderType: 'customer',
      body: 'Hello shop!',
      createdAt: '2026-04-16T12:00:00Z',
    };

    useChatStore.getState().addMessage(message);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].body).toBe('Hello shop!');
  });

  it('should set messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        shopId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        orderId: null,
        senderType: 'customer',
        body: 'First message',
        createdAt: '2026-04-16T12:00:00Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        shopId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: null,
        orderId: null,
        senderType: 'shop',
        body: 'Second message',
        createdAt: '2026-04-16T12:01:00Z',
      },
    ];

    useChatStore.getState().setMessages(messages);
    expect(useChatStore.getState().messages).toEqual(messages);
  });

  it('should clear messages', () => {
    const message: ChatMessage = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      shopId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: null,
      senderType: 'customer',
      body: 'Test',
      createdAt: '2026-04-16T12:00:00Z',
    };

    useChatStore.getState().addMessage(message);
    useChatStore.getState().setError('Some error');

    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().error).toBeNull();
  });

  it('should set and clear error', () => {
    useChatStore.getState().setError('Connection failed');
    expect(useChatStore.getState().error).toBe('Connection failed');

    useChatStore.getState().setError(null);
    expect(useChatStore.getState().error).toBeNull();
  });

  it('should set loading state', () => {
    useChatStore.getState().setLoading(true);
    expect(useChatStore.getState().loading).toBe(true);

    useChatStore.getState().setLoading(false);
    expect(useChatStore.getState().loading).toBe(false);
  });

  it('should set active shop', () => {
    const shopId = '550e8400-e29b-41d4-a716-446655440001';
    useChatStore.getState().setActiveShop(shopId);
    expect(useChatStore.getState().activeShopId).toBe(shopId);

    useChatStore.getState().setActiveShop(null);
    expect(useChatStore.getState().activeShopId).toBeNull();
  });

  it('should maintain multiple messages in order', () => {
    const shop1Id = '550e8400-e29b-41d4-a716-446655440001';
    const customerId = '550e8400-e29b-41d4-a716-446655440002';

    const msg1: ChatMessage = {
      id: '1',
      shopId: shop1Id,
      customerId,
      orderId: null,
      senderType: 'customer',
      body: 'First',
      createdAt: '2026-04-16T12:00:00Z',
    };

    const msg2: ChatMessage = {
      id: '2',
      shopId: shop1Id,
      customerId: null,
      orderId: null,
      senderType: 'shop',
      body: 'Second',
      createdAt: '2026-04-16T12:01:00Z',
    };

    const msg3: ChatMessage = {
      id: '3',
      shopId: shop1Id,
      customerId,
      orderId: null,
      senderType: 'customer',
      body: 'Third',
      createdAt: '2026-04-16T12:02:00Z',
    };

    useChatStore.getState().addMessage(msg1);
    useChatStore.getState().addMessage(msg2);
    useChatStore.getState().addMessage(msg3);

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(3);
    expect(messages[0].body).toBe('First');
    expect(messages[1].body).toBe('Second');
    expect(messages[2].body).toBe('Third');
  });
});
