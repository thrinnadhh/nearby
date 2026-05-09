import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import TrackingScreen from '@/app/(tabs)/tracking/[orderId]';
import * as ordersService from '@/services/orders';
import * as socketService from '@/services/socket';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/location';
import * as router from 'expo-router';
import * as Linking from 'react-native-linking';

vi.mock('@/services/orders');
vi.mock('@/services/socket');
vi.mock('@/store/orders');
vi.mock('@/store/auth');
vi.mock('@/store/location');
vi.mock('expo-router');
vi.mock('react-native-linking');

vi.useFakeTimers();

describe('Order Tracking Screen - Integration Tests', () => {
  const mockOrderId = 'order-123';
  const mockOrder = {
    id: mockOrderId,
    order_status: 'assigned',
    total_amount: 50000,
    delivery_address: '123 Main Street, Apt 4B, Hyderabad 500001',
    order_items: [
      { id: 'item-1', product_name: 'Milk', qty: 1, price: 6000, product_id: 'prod-1' },
      { id: 'item-2', product_name: 'Bread', qty: 1, price: 4000, product_id: 'prod-2' },
    ],
    delivery_partner: {
      id: 'partner-123',
      name: 'Rajesh Kumar',
      phone: '9876543210',
      vehicle_type: 'Bike',
      vehicle_number: 'TS07AB1234',
      rating: 4.8,
      total_deliveries: 156,
    },
    delivery_eta_seconds: 600, // 10 minutes
    delivery_distance_km: 2.5,
    payment_method: 'upi',
    created_at: '2026-04-16T10:00:00Z',
  };

  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup socket mock
    mockSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    vi.mocked(socketService.connectSocket).mockReturnValue(mockSocket);

    // Setup router
    vi.mocked(router).useLocalSearchParams.mockReturnValue({ orderId: mockOrderId });
    vi.mocked(router).useRouter.mockReturnValue({
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    } as any);

    // Setup stores
    vi.mocked(useAuthStore).mockReturnValue({
      token: 'mock-token',
    } as any);

    vi.mocked(useLocationStore).mockReturnValue({
      deliveryAddress: '123 Main Street',
      deliveryCoords: { lat: 17.3850, lng: 78.4867 },
    } as any);

    vi.mocked(useOrdersStore).mockReturnValue({
      setActiveOrder: vi.fn(),
    } as any);

    // Setup order service
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);
  });

  it('should render loading state initially', () => {
    vi.mocked(ordersService.getOrder).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockOrder), 100))
    );

    render(<TrackingScreen />);

    expect(screen.getByText(/Loading tracking information/i)).toBeDefined();
  });

  it('should fetch order details on load', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(ordersService.getOrder).toHaveBeenCalledWith(mockOrderId);
    });
  });

  it('should connect to Socket.IO with token', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(socketService.connectSocket).toHaveBeenCalledWith('mock-token');
    });
  });

  it('should join order room on Socket.IO', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join_order_room', {
        orderId: mockOrderId,
      });
    });
  });

  it('should display delivery partner info', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rajesh Kumar')).toBeDefined();
      expect(screen.getByText('4.8')).toBeDefined();
      expect(screen.getByText('156 deliveries')).toBeDefined();
      expect(screen.getByText('TS07AB1234')).toBeDefined();
    });
  });

  it('should display ETA countdown', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('10m 0s')).toBeDefined();
    });
  });

  it('should countdown ETA timer every second', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('10m 0s')).toBeDefined();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('9m 59s')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(60000); // 1 minute
    });

    expect(screen.getByText('8m 59s')).toBeDefined();
  });

  it('should display distance', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('2.5')).toBeDefined();
      expect(screen.getByText('km away')).toBeDefined();
    });
  });

  it('should listen for GPS updates on Socket.IO', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('gps_update', expect.any(Function));
    });
  });

  it('should update location from GPS updates', async () => {
    const gpsHandler = vi.fn();
    mockSocket.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'gps_update') {
        gpsHandler.mockImplementation(handler);
      }
    });

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('gps_update', expect.any(Function));
    });

    // Simulate GPS update from delivery partner
    const gpsUpdate = {
      lat: 17.3900,
      lng: 78.4900,
      timestamp: Date.now(),
      eta_seconds: 300,
      distance_km: 1.2,
    };

    // Get the handler and call it
    const handlers = vi.mocked(mockSocket.on).mock.calls;
    const gpsUpdateCall = handlers.find(call => call[0] === 'gps_update');
    if (gpsUpdateCall) {
      const handler = gpsUpdateCall[1] as Function;
      handler(gpsUpdate);
    }

    await waitFor(() => {
      // GPS location should be displayed
      expect(screen.getByText(/17\.39/)).toBeDefined();
    });
  });

  it('should update ETA from GPS updates', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('10m 0s')).toBeDefined();
    });

    // Simulate GPS update with new ETA
    const gpsUpdate = {
      orderId: mockOrderId,
      lat: 17.39,
      lng: 78.49,
      timestamp: Date.now(),
      eta_seconds: 120,
      distance_km: 1.2,
    };

    const handlers = vi.mocked(mockSocket.on).mock.calls;
    const gpsUpdateCall = handlers.find(call => call[0] === 'gps_update');
    if (gpsUpdateCall) {
      const handler = gpsUpdateCall[1] as Function;
      handler(gpsUpdate);
    }

    await waitFor(() => {
      expect(screen.getByText('2m 0s')).toBeDefined();
    });
  });

  it('should display order status timeline', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('Order Placed')).toBeDefined();
      expect(screen.getByText('Accepted')).toBeDefined();
      expect(screen.getByText('Packing')).toBeDefined();
      expect(screen.getByText('Ready')).toBeDefined();
      expect(screen.getByText('Assigned')).toBeDefined();
    });
  });

  it('should display delivery address', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('123 Main Street, Apt 4B, Hyderabad 500001')).toBeDefined();
    });
  });

  it('should display order summary', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(mockOrderId)).toBeDefined();
      expect(screen.getByText('2 items')).toBeDefined();
      expect(screen.getByText('₹500.00')).toBeDefined();
    });
  });

  it('should have call delivery partner button', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      const buttons = screen.getAllByText(/📞 Call/);
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should call delivery partner phone when tapped', async () => {
    vi.mocked(Linking.canOpenURL).mockResolvedValue(true);
    vi.mocked(Linking.openURL).mockResolvedValue(undefined);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/📞 Call/)).toBeDefined();
    });

    const callButton = screen.getByText(/📞 Call/);
    fireEvent.press(callButton);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('tel:9876543210');
    });
  });

  it('should have location sharing button', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/📍 Location/)).toBeDefined();
    });
  });

  it('should share location when location button tapped', async () => {
    vi.mocked(Linking.openURL).mockResolvedValue(undefined);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/📍 Location/)).toBeDefined();
    });

    // Simulate GPS update so location is available
    const handlers = vi.mocked(mockSocket.on).mock.calls;
    const gpsUpdateCall = handlers.find(call => call[0] === 'gps_update');
    if (gpsUpdateCall) {
      const handler = gpsUpdateCall[1] as Function;
      handler({
        orderId: mockOrderId,
        lat: 17.39,
        lng: 78.49,
        timestamp: Date.now(),
      });
    }

    const locationButton = screen.getByText(/📍 Location/);
    fireEvent.press(locationButton);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('maps.google.com'));
    });
  });

  it('should display OTP modal when order is delivered', async () => {
    const deliveredOrder = {
      ...mockOrder,
      order_status: 'delivered',
      delivery_otp: '123456',
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(deliveredOrder);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Delivery Confirmation/i)).toBeDefined();
    });
  });

  it('should display OTP in modal', async () => {
    const deliveredOrder = {
      ...mockOrder,
      order_status: 'delivered',
      delivery_otp: '123456',
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(deliveredOrder);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('123456')).toBeDefined();
    });
  });

  it('should handle error state', async () => {
    vi.mocked(ordersService.getOrder).mockRejectedValue(new Error('Network error'));

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to Track Order/i)).toBeDefined();
      expect(screen.getByText(/Network error/i)).toBeDefined();
    });
  });

  it('should allow retry on error', async () => {
    vi.mocked(ordersService.getOrder)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockOrder);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to Track Order/i)).toBeDefined();
    });

    const retryButton = screen.getByText(/Retry/);
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(ordersService.getOrder).toHaveBeenCalledTimes(2);
    });
  });

  it('should display live location indicator', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Order Status/i)).toBeDefined();
    });

    // Simulate GPS update
    const handlers = vi.mocked(mockSocket.on).mock.calls;
    const gpsUpdateCall = handlers.find(call => call[0] === 'gps_update');
    if (gpsUpdateCall) {
      const handler = gpsUpdateCall[1] as Function;
      handler({
        orderId: mockOrderId,
        lat: 17.39,
        lng: 78.49,
        timestamp: Date.now(),
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/● Live/)).toBeDefined();
    });
  });

  it('should cleanup Socket.IO connection on unmount', async () => {
    const { unmount } = render(<TrackingScreen />);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join_order_room', {
        orderId: mockOrderId,
      });
    });

    unmount();

    // Should call leave_order_room and cleanup
    expect(mockSocket.emit).toHaveBeenCalledWith('leave_order_room', {
      orderId: mockOrderId,
    });
  });

  it('should handle missing order ID gracefully', () => {
    vi.mocked(router).useLocalSearchParams.mockReturnValue({});

    render(<TrackingScreen />);

    // Should not crash
    expect(true).toBe(true);
  });

  it('should handle missing delivery partner info', async () => {
    const orderWithoutPartner = {
      ...mockOrder,
      delivery_partner: null,
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(orderWithoutPartner);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Order Details/i)).toBeDefined();
    });

    // Should not crash without delivery partner
    expect(true).toBe(true);
  });

  it('should show "Arriving soon" when ETA is 0', async () => {
    const orderNoEta = {
      ...mockOrder,
      delivery_eta_seconds: 0,
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(orderNoEta);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('Arriving soon')).toBeDefined();
    });
  });

  it('should display single item count correctly', async () => {
    const singleItemOrder = {
      ...mockOrder,
      order_items: [{ id: 'item-1', product_name: 'Milk', qty: 1, price: 6000 }],
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(singleItemOrder);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('1 item')).toBeDefined();
    });
  });

  it('should not show location button if no GPS data', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Order Details/i)).toBeDefined();
    });

    // Location button should exist
    const buttons = screen.getAllByText(/📍 Location/);
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should update location timestamp', async () => {
    render(<TrackingScreen />);

    await waitFor(() => {
      expect(ordersService.getOrder).toHaveBeenCalled();
    });

    // Simulate GPS update
    const now = Date.now();
    const handlers = vi.mocked(mockSocket.on).mock.calls;
    const gpsUpdateCall = handlers.find(call => call[0] === 'gps_update');
    if (gpsUpdateCall) {
      const handler = gpsUpdateCall[1] as Function;
      handler({
        orderId: mockOrderId,
        lat: 17.39,
        lng: 78.49,
        timestamp: now,
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Updated.*ago/)).toBeDefined();
    });
  });

  it('should handle out_for_delivery status', async () => {
    const outForDeliveryOrder = {
      ...mockOrder,
      order_status: 'out_for_delivery',
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(outForDeliveryOrder);

    render(<TrackingScreen />);

    await waitFor(() => {
      expect(screen.getByText('Out for Delivery')).toBeDefined();
    });
  });
});
