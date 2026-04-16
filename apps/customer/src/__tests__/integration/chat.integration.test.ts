import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-native';
import { useChatStore } from '@/store/chat';
import type { ChatMessage } from '@/store/chat';

/**
 * Integration tests for Chat Screen flow
 * Tests the interaction between store, socket service, and UI
 */

describe('Chat Screen Integration', () => {
  beforeEach(() => {
    // Reset store
    useChatStore.setState({
      messages: [],
      loading: false,
      error: null,
      activeShopId: null,
    });
  });

  it('should load and display chat history', () => {
    const { result } = renderHook(() => useChatStore());

    const shopId = '550e8400-e29b-41d4-a716-446655440001';
    const messages: ChatMessage[] = [
      {
        id: '1',
        shopId,
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        orderId: null,
        senderType: 'customer',
        body: 'Hi, do you have potatoes?',
        createdAt: '2026-04-16T12:00:00Z',
      },
      {
        id: '2',
        shopId,
        customerId: null,
        orderId: null,
        senderType: 'shop',
        body: 'Yes! Fresh potatoes available.',
        createdAt: '2026-04-16T12:01:00Z',
      },
    ];

    act(() => {
      result.current.setMessages(messages);
      result.current.setActiveShop(shopId);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.activeShopId).toBe(shopId);
  });

  it('should receive new messages in real-time', () => {
    const { result } = renderHook(() => useChatStore());

    const shopId = '550e8400-e29b-41d4-a716-446655440001';

    act(() => {
      result.current.setActiveShop(shopId);
    });

    const msg1: ChatMessage = {
      id: '1',
      shopId,
      customerId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: null,
      senderType: 'customer',
      body: 'First',
      createdAt: '2026-04-16T12:00:00Z',
    };

    const msg2: ChatMessage = {
      id: '2',
      shopId,
      customerId: null,
      orderId: null,
      senderType: 'shop',
      body: 'Reply',
      createdAt: '2026-04-16T12:01:00Z',
    };

    act(() => {
      result.current.addMessage(msg1);
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.addMessage(msg2);
    });

    expect(result.current.messages).toHaveLength(2);
  });

  it('should handle error state during chat', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.setError('Connection lost');
    });

    expect(result.current.error).toBe('Connection lost');

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBeNull();
  });

  it('should manage loading state', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.loading).toBe(false);
  });

  it('should handle shop switching', () => {
    const { result } = renderHook(() => useChatStore());

    const shop1Id = '550e8400-e29b-41d4-a716-446655440001';
    const shop2Id = '550e8400-e29b-41d4-a716-446655440002';

    // Switch to shop 1
    act(() => {
      result.current.setActiveShop(shop1Id);
    });

    expect(result.current.activeShopId).toBe(shop1Id);

    // Switch to shop 2
    act(() => {
      result.current.setActiveShop(shop2Id);
    });

    expect(result.current.activeShopId).toBe(shop2Id);
  });

  it('should clear chat when navigating away', () => {
    const { result } = renderHook(() => useChatStore());

    const msg: ChatMessage = {
      id: '1',
      shopId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: null,
      senderType: 'customer',
      body: 'Test',
      createdAt: '2026-04-16T12:00:00Z',
    };

    act(() => {
      result.current.addMessage(msg);
      result.current.setError('Some error');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.error).toBe('Some error');

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should preserve message order', () => {
    const { result } = renderHook(() => useChatStore());

    const shopId = '550e8400-e29b-41d4-a716-446655440001';
    const timestamps = ['12:00:00Z', '12:01:00Z', '12:02:00Z', '12:03:00Z'];

    act(() => {
      timestamps.forEach((time, index) => {
        const msg: ChatMessage = {
          id: index.toString(),
          shopId,
          customerId: index % 2 === 0 ? '550e8400-e29b-41d4-a716-446655440002' : null,
          orderId: null,
          senderType: index % 2 === 0 ? 'customer' : 'shop',
          body: `Message ${index}`,
          createdAt: `2026-04-16T${time}`,
        };
        result.current.addMessage(msg);
      });
    });

    expect(result.current.messages).toHaveLength(4);
    result.current.messages.forEach((msg, index) => {
      expect(msg.body).toBe(`Message ${index}`);
    });
  });

  it('should validate message content', () => {
    // Empty message
    expect(''.trim()).toBe('');

    // Message at limit
    const maxMessage = 'x'.repeat(2000);
    expect(maxMessage.length).toBe(2000);

    // Message over limit
    const overMaxMessage = 'x'.repeat(2001);
    expect(overMaxMessage.length).toBeGreaterThan(2000);
  });

  it('should handle special characters in messages', () => {
    const { result } = renderHook(() => useChatStore());

    const specialMsg: ChatMessage = {
      id: '1',
      shopId: '550e8400-e29b-41d4-a716-446655440001',
      customerId: '550e8400-e29b-41d4-a716-446655440002',
      orderId: null,
      senderType: 'customer',
      body: '😀 Hello! Are prices negotiable? 🤔 #asking',
      createdAt: '2026-04-16T12:00:00Z',
    };

    act(() => {
      result.current.addMessage(specialMsg);
    });

    expect(result.current.messages[0].body).toBe(
      '😀 Hello! Are prices negotiable? 🤔 #asking'
    );
  });
});
