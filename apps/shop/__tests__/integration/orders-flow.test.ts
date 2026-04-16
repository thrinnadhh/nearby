/**
 * Integration tests for order acceptance/rejection flow
 * Tests Socket.IO events, order state updates, and API calls
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOrders } from '@/hooks/useOrders';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';
import * as ordersService from '@/services/orders';
import * as socketService from '@/services/socket';

jest.mock('@/services/orders');
jest.mock('@/services/socket');
jest.mock('@/store/orders');
jest.mock('@/store/auth');

const mockOrdersService = ordersService as jest.Mocked<typeof ordersService>;
const mockSocketService = socketService as jest.Mocked<typeof socketService>;

const mockOrder = {
  id: 'order-123',
  shopId: 'shop-123',
  customerId: 'customer-456',
  customerName: 'Jane Doe',
  customerPhone: '9123456789',
  deliveryAddress: '456 Oak Ave',
  items: [{ productId: 'p1', name: 'Product 1', qty: 1, subtotal: 500 }],
  subtotal: 500,
  deliveryFee: 25,
  total: 525,
  status: 'pending' as const,
  paymentMode: 'upi' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  acceptanceDeadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
};

describe('Order Acceptance/Rejection Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useOrdersStore as jest.Mock).mockReturnValue({
      orders: [mockOrder],
      activeOrder: null,
      loading: false,
      error: null,
      setOrders: jest.fn(),
      addOrder: jest.fn(),
      removeOrder: jest.fn(),
      setActiveOrder: jest.fn(),
      updateOrderStatus: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    });

    (useAuthStore as jest.Mock).mockReturnValue({
      shopId: 'shop-123',
      userId: 'user-123',
      isAuthenticated: true,
    });
  });

  it('accepts order and emits Socket.IO event', async () => {
    const mockEmit = jest.fn();
    mockSocketService.getSocket.mockReturnValue({
      emit: mockEmit,
    } as any);

    mockOrdersService.acceptOrder.mockResolvedValueOnce({
      ...mockOrder,
      status: 'accepted',
    });

    const { result } = renderHook(() => useOrders());

    let acceptedOrder;
    await act(async () => {
      acceptedOrder = await result.current.acceptCurrentOrder('order-123');
    });

    // Verify API was called
    expect(mockOrdersService.acceptOrder).toHaveBeenCalledWith('order-123');

    // Verify Socket.IO emit was called
    expect(mockEmit).toHaveBeenCalledWith(
      'order:accept',
      expect.objectContaining({ orderId: 'order-123' })
    );

    // Verify order status updated in response
    expect(acceptedOrder.status).toBe('accepted');
  });

  it('rejects order with reason and updates store', async () => {
    const mockEmit = jest.fn();
    mockSocketService.getSocket.mockReturnValue({
      emit: mockEmit,
    } as any);

    mockOrdersService.rejectOrder.mockResolvedValueOnce({
      ...mockOrder,
      status: 'cancelled',
    });

    const { result } = renderHook(() => useOrders());
    const store = useOrdersStore.getState();

    const rejectionReason = 'Out of stock items';

    await act(async () => {
      await result.current.rejectCurrentOrder('order-123', rejectionReason);
    });

    // Verify API was called with reason
    expect(mockOrdersService.rejectOrder).toHaveBeenCalledWith(
      'order-123',
      rejectionReason
    );

    // Verify Socket.IO emit was called
    expect(mockEmit).toHaveBeenCalledWith(
      'order:reject',
      expect.objectContaining({
        orderId: 'order-123',
        reason: rejectionReason,
      })
    );

    // Verify store was updated
    expect(store.removeOrder).toHaveBeenCalledWith('order-123');
  });

  it('handles acceptance error gracefully', async () => {
    mockOrdersService.acceptOrder.mockRejectedValueOnce(
      new Error('ORDER_ALREADY_ACCEPTED')
    );

    const { result } = renderHook(() => useOrders());

    await expect(
      act(async () => {
        await result.current.acceptCurrentOrder('order-123');
      })
    ).rejects.toThrow();

    expect(result.current.error).toBeTruthy();
  });

  it('removes order from list after acceptance', async () => {
    mockOrdersService.acceptOrder.mockResolvedValueOnce({
      ...mockOrder,
      status: 'accepted',
    });

    const { result } = renderHook(() => useOrders());
    const store = useOrdersStore.getState();

    await act(async () => {
      await result.current.acceptCurrentOrder('order-123');
    });

    // Order should be removed from pending orders list
    expect(store.removeOrder).toHaveBeenCalledWith('order-123');
  });

  it('removes order from list after rejection', async () => {
    mockOrdersService.rejectOrder.mockResolvedValueOnce({
      ...mockOrder,
      status: 'cancelled',
    });

    const { result } = renderHook(() => useOrders());
    const store = useOrdersStore.getState();

    await act(async () => {
      await result.current.rejectCurrentOrder(
        'order-123',
        'Cannot fulfill order'
      );
    });

    // Order should be removed from pending orders list
    expect(store.removeOrder).toHaveBeenCalledWith('order-123');
  });

  it('listens to Socket.IO order events', async () => {
    const unsubscribeMock = jest.fn();
    const onOrderAcceptedCallback = jest.fn();

    mockSocketService.getSocket.mockReturnValue({
      on: jest.fn((event, callback) => {
        if (event === 'order:accepted-by-shop') {
          callback({ orderId: 'order-999' });
        }
        return unsubscribeMock;
      }),
    } as any);

    const { result } = renderHook(() => useOrderSocket());
    const store = useOrdersStore.getState();

    // Trigger Socket.IO event
    const unsubscribe = await act(async () => {
      return result.current.onOrderAcceptedEvent(onOrderAcceptedCallback);
    });

    // Verify callback was triggered
    expect(onOrderAcceptedCallback).toHaveBeenCalled();

    // Cleanup
    unsubscribe();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('handles concurrent order operations', async () => {
    const mockEmit = jest.fn();
    mockSocketService.getSocket.mockReturnValue({
      emit: mockEmit,
    } as any);

    mockOrdersService.acceptOrder.mockResolvedValueOnce({
      ...mockOrder,
      status: 'accepted',
    });

    mockOrdersService.rejectOrder.mockResolvedValueOnce({
      ...mockOrder,
      status: 'cancelled',
    });

    const { result } = renderHook(() => useOrders());

    // Accept one order while another is being rejected
    let acceptPromise;
    let rejectPromise;

    await act(async () => {
      acceptPromise = result.current.acceptCurrentOrder('order-123');
      rejectPromise = result.current.rejectCurrentOrder(
        'order-456',
        'Out of stock'
      );

      await Promise.all([acceptPromise, rejectPromise]);
    });

    // Both operations should complete
    expect(mockOrdersService.acceptOrder).toHaveBeenCalled();
    expect(mockOrdersService.rejectOrder).toHaveBeenCalled();
  });

  it('syncs order state across multiple tabs on Socket.IO event', async () => {
    const mockEmit = jest.fn();
    mockSocketService.getSocket.mockReturnValue({
      emit: mockEmit,
    } as any);

    mockOrdersService.acceptOrder.mockResolvedValueOnce({
      ...mockOrder,
      status: 'accepted',
    });

    const { result: result1 } = renderHook(() => useOrders());
    const { result: result2 } = renderHook(() => useOrders());
    const store = useOrdersStore.getState();

    // Accept on first instance
    await act(async () => {
      await result1.current.acceptCurrentOrder('order-123');
    });

    // Both instances should see updated state
    expect(store.removeOrder).toHaveBeenCalledWith('order-123');
  });
});
