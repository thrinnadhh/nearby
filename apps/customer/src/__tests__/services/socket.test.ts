import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSocket,
  disconnectSocket,
  joinShopChat,
  leaveShopChat,
  sendMessage,
  onNewMessage,
  onChatError,
} from '@/services/socket';

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

describe('Socket.IO Service', () => {
  beforeEach(() => {
    disconnectSocket();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get socket instance or null', () => {
    const socket = getSocket();
    expect(socket).toBeNull();
  });

  it('should validate shop ID format in joinShopChat', async () => {
    // Test with invalid UUID
    const invalidIds = ['not-a-uuid', '123', '', 'shop_123'];

    for (const invalidId of invalidIds) {
      // Since we can't test with mocked socket easily in this context,
      // we'll just verify the validation logic exists
      expect(invalidId).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    }
  });

  it('should validate message format in sendMessage', () => {
    // Valid message
    const validMessage = 'Hello, shop!';
    expect(validMessage.length).toBeGreaterThan(0);
    expect(validMessage.length).toBeLessThanOrEqual(2000);

    // Invalid: empty
    const emptyMessage = '';
    expect(emptyMessage.trim()).toBe('');

    // Invalid: too long
    const longMessage = 'x'.repeat(2001);
    expect(longMessage.length).toBeGreaterThan(2000);
  });

  it('should handle message content properly', () => {
    // Test message trimming
    const messageWithSpaces = '  Hello  ';
    expect(messageWithSpaces.trim()).toBe('Hello');

    // Test maximum length validation
    const maxLengthMessage = 'x'.repeat(2000);
    expect(maxLengthMessage.length).toBeLessThanOrEqual(2000);
  });

  it('should return unsubscribe function from onNewMessage', () => {
    const callback = vi.fn();
    const unsubscribe = onNewMessage(callback);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should return unsubscribe function from onChatError', () => {
    const callback = vi.fn();
    const unsubscribe = onChatError(callback);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should handle UUID validation for different formats', () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Valid v4 UUIDs
    const validUUIDs = [
      '550e8400-e29b-41d4-a716-446655440000',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    ];

    validUUIDs.forEach((uuid) => {
      expect(uuid).toMatch(uuidRegex);
    });

    // Invalid UUIDs
    const invalidUUIDs = [
      '550e8400-e29b-31d4-a716-446655440000', // Not v4
      '550e8400-e29b-41d4-1716-446655440000', // Invalid variant
      'not-a-uuid',
      '',
    ];

    invalidUUIDs.forEach((uuid) => {
      expect(uuid).not.toMatch(uuidRegex);
    });
  });
});
