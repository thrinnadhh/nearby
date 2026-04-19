/**
 * Unit tests for useOrderSocket hook
 */

import { renderHook } from '@testing-library/react-native';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import * as socketService from '@/services/socket';

jest.mock('@/store/auth');
jest.mock('@/store/orders');
jest.mock('@/services/socket');

const mockAddOrder = jest.fn();
const mockInitSocket = socketService.initializeSocket as jest.Mock;
const mockCloseSocket = socketService.closeSocket as jest.Mock;
const mockOnOrderNew = socketService.onOrderNew as jest.Mock;
const mockOnOrderAccepted = socketService.onOrderAccepted as jest.Mock;
const mockOnOrderRejected = socketService.onOrderRejected as jest.Mock;

const mockUnsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: any) => any) => {
    const state = { token: 'jwt-abc', shopId: 'shop-1' };
    return selector(state);
  });
  (useOrdersStore as unknown as jest.Mock).mockReturnValue({ addOrder: mockAddOrder });
  mockOnOrderNew.mockReturnValue(mockUnsubscribe);
  mockOnOrderAccepted.mockReturnValue(mockUnsubscribe);
  mockOnOrderRejected.mockReturnValue(mockUnsubscribe);
});

describe('useOrderSocket', () => {
  it('initializes socket on mount when token and shopId are available', () => {
    renderHook(() => useOrderSocket());
    expect(mockInitSocket).toHaveBeenCalledWith('jwt-abc', 'shop-1');
  });

  it('does not initialize socket when token is missing', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: any) => any) => {
      const state = { token: null, shopId: 'shop-1' };
      return selector(state);
    });

    renderHook(() => useOrderSocket());
    expect(mockInitSocket).not.toHaveBeenCalled();
  });

  it('closes socket on unmount', () => {
    const { unmount } = renderHook(() => useOrderSocket());
    unmount();
    expect(mockCloseSocket).toHaveBeenCalled();
  });

  it('onNewOrder registers listener and callback fires', () => {
    const orderEvent = { orderId: 'order-1', total: 12500, itemsCount: 2 };
    mockOnOrderNew.mockImplementation((cb: Function) => {
      cb(orderEvent);
      return mockUnsubscribe;
    });

    const callback = jest.fn();
    const { result } = renderHook(() => useOrderSocket());
    result.current.onNewOrder(callback);

    expect(callback).toHaveBeenCalledWith(orderEvent);
  });

  it('onOrderAcceptedEvent registers listener', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useOrderSocket());
    result.current.onOrderAcceptedEvent(callback);

    expect(mockOnOrderAccepted).toHaveBeenCalled();
  });

  it('onOrderRejectedEvent registers listener', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useOrderSocket());
    result.current.onOrderRejectedEvent(callback);

    expect(mockOnOrderRejected).toHaveBeenCalled();
  });

  it('onOrderAcceptedEvent callback fires with orderId and data', () => {
    const payload = { orderId: 'order-1', shopId: 'shop-1' };
    mockOnOrderAccepted.mockImplementation((cb: Function) => {
      cb(payload);
      return mockUnsubscribe;
    });

    const callback = jest.fn();
    const { result } = renderHook(() => useOrderSocket());
    result.current.onOrderAcceptedEvent(callback);

    expect(callback).toHaveBeenCalledWith('order-1', payload);
  });

  it('onOrderRejectedEvent callback fires with orderId and data', () => {
    const payload = { orderId: 'order-2', reason: 'Out of stock' };
    mockOnOrderRejected.mockImplementation((cb: Function) => {
      cb(payload);
      return mockUnsubscribe;
    });

    const callback = jest.fn();
    const { result } = renderHook(() => useOrderSocket());
    result.current.onOrderRejectedEvent(callback);

    expect(callback).toHaveBeenCalledWith('order-2', payload);
  });
});
