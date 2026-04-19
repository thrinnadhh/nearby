/**
 * Integration tests for socket service — initializeSocket, closeSocket, event listeners
 */

import { io as mockIo } from 'socket.io-client';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();
const mockDisconnect = jest.fn();

const mockSocketInstance = {
  on: mockOn,
  off: mockOff,
  emit: mockEmit,
  disconnect: mockDisconnect,
  id: 'mock-socket-id',
};

(mockIo as jest.Mock).mockReturnValue(mockSocketInstance);

import {
  initializeSocket,
  closeSocket,
  getSocket,
  onOrderNew,
  onOrderAccepted,
  onOrderRejected,
} from '@/services/socket';

beforeEach(() => {
  // closeSocket before clearAllMocks so the disconnect call doesn't pollute counts
  closeSocket();
  jest.clearAllMocks();
});

describe('initializeSocket', () => {
  it('creates socket with bearer token auth', () => {
    initializeSocket('my-jwt', 'shop-1');

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'Bearer my-jwt' } })
    );
  });

  it('registers connect, disconnect, connect_error handlers', () => {
    initializeSocket('my-jwt', 'shop-1');

    const registeredEvents = mockOn.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
    expect(registeredEvents).toContain('connect_error');
  });

  it('returns existing instance when called twice', () => {
    initializeSocket('my-jwt', 'shop-1');
    const second = initializeSocket('other-jwt', 'shop-2');

    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(second).toBe(mockSocketInstance);
  });

  it('emits join-room on connect callback', () => {
    initializeSocket('my-jwt', 'shop-1');

    // Find connect handler and invoke it
    const connectCall = mockOn.mock.calls.find((c) => c[0] === 'connect');
    connectCall?.[1]();

    expect(mockEmit).toHaveBeenCalledWith('join-room', { room: 'shop:shop-1' });
  });
});

describe('closeSocket', () => {
  it('disconnects and clears socket instance', () => {
    initializeSocket('my-jwt', 'shop-1');
    closeSocket();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(getSocket()).toBeNull();
  });

  it('is safe to call when no socket exists', () => {
    expect(() => closeSocket()).not.toThrow();
  });
});

describe('onOrderNew', () => {
  it('registers listener and returns unsubscribe function', () => {
    initializeSocket('my-jwt', 'shop-1');
    const callback = jest.fn();

    const unsubscribe = onOrderNew(callback);

    expect(mockOn).toHaveBeenCalledWith('order:new', expect.any(Function));
    expect(typeof unsubscribe).toBe('function');
  });

  it('calls callback with order data when event fires', () => {
    initializeSocket('my-jwt', 'shop-1');
    const callback = jest.fn();
    onOrderNew(callback);

    const listener = mockOn.mock.calls.find((c) => c[0] === 'order:new')?.[1];
    listener?.({ orderId: 'order-1', total: 12500, itemsCount: 2 });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1' })
    );
  });

  it('unsubscribe removes listener', () => {
    initializeSocket('my-jwt', 'shop-1');
    const callback = jest.fn();
    const unsubscribe = onOrderNew(callback);

    unsubscribe();

    expect(mockOff).toHaveBeenCalledWith('order:new', expect.any(Function));
  });
});

describe('onOrderAccepted', () => {
  it('registers listener and unsubscribes correctly', () => {
    initializeSocket('my-jwt', 'shop-1');
    const callback = jest.fn();
    const unsubscribe = onOrderAccepted(callback);

    const listener = mockOn.mock.calls.find((c) => c[0] === 'order:accepted')?.[1];
    listener?.({ orderId: 'order-1', shopId: 'shop-1' });

    expect(callback).toHaveBeenCalledWith({ orderId: 'order-1', shopId: 'shop-1' });

    unsubscribe();
    expect(mockOff).toHaveBeenCalledWith('order:accepted', expect.any(Function));
  });
});

describe('onOrderRejected', () => {
  it('registers listener and unsubscribes correctly', () => {
    initializeSocket('my-jwt', 'shop-1');
    const callback = jest.fn();
    const unsubscribe = onOrderRejected(callback);

    const listener = mockOn.mock.calls.find((c) => c[0] === 'order:rejected')?.[1];
    listener?.({ orderId: 'order-1', reason: 'Out of stock' });

    expect(callback).toHaveBeenCalledWith({ orderId: 'order-1', reason: 'Out of stock' });

    unsubscribe();
    expect(mockOff).toHaveBeenCalledWith('order:rejected', expect.any(Function));
  });
});
