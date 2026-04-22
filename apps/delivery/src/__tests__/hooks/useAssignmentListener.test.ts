/**
 * Unit tests for useAssignmentListener hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAssignmentListener } from '@/hooks/useAssignmentListener';
import { useAuthStore } from '@/store/auth';
import { useAssignmentStore } from '@/store/assignment';
import * as socketService from '@/services/socket';

jest.mock('@/store/auth');
jest.mock('@/store/assignment');
jest.mock('@/services/socket');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseAssignmentStore = useAssignmentStore as jest.MockedFunction<
  typeof useAssignmentStore
>;
const mockSocketService = socketService as jest.Mocked<typeof socketService>;

describe('useAssignmentListener Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default state when not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: null,
      token: null,
      isAuthenticated: false,
    } as any);

    mockUseAssignmentStore.mockReturnValue({
      isListening: false,
      error: null,
      pendingAssignments: [],
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: jest.fn(),
    } as any);

    const { result } = renderHook(() => useAssignmentListener());

    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pendingCount).toBe(0);
  });

  it('should join delivery room when authenticated', async () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    const mockSetListening = jest.fn();
    const mockSetError = jest.fn();
    const mockAddPendingAssignment = jest.fn();

    mockUseAssignmentStore.mockReturnValue({
      isListening: false,
      error: null,
      pendingAssignments: [],
      setListening: mockSetListening,
      setError: mockSetError,
      addPendingAssignment: mockAddPendingAssignment,
    } as any);

    mockSocketService.getSocket.mockReturnValue({ connected: true } as any);
    mockSocketService.joinDeliveryRoom.mockResolvedValue();

    const { result } = renderHook(() => useAssignmentListener());

    await waitFor(() => {
      expect(mockSocketService.joinDeliveryRoom).toHaveBeenCalledWith(
        'partner-123'
      );
    });

    await waitFor(() => {
      expect(mockSetListening).toHaveBeenCalledWith(true);
    });
  });

  it('should handle join room failure', async () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    const mockSetListening = jest.fn();
    const mockSetError = jest.fn();

    mockUseAssignmentStore.mockReturnValue({
      isListening: false,
      error: null,
      pendingAssignments: [],
      setListening: mockSetListening,
      setError: mockSetError,
      addPendingAssignment: jest.fn(),
    } as any);

    mockSocketService.getSocket.mockReturnValue({ connected: true } as any);
    mockSocketService.joinDeliveryRoom.mockRejectedValue(
      new Error('Join failed')
    );

    const { result } = renderHook(() => useAssignmentListener());

    await waitFor(() => {
      expect(mockSetListening).toHaveBeenCalledWith(false);
    });

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Join failed');
    });
  });

  it('should add pending assignment when event received', async () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    const mockAddPendingAssignment = jest.fn();

    mockUseAssignmentStore.mockReturnValue({
      isListening: false,
      error: null,
      pendingAssignments: [],
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: mockAddPendingAssignment,
    } as any);

    mockSocketService.getSocket.mockReturnValue({ connected: true } as any);
    mockSocketService.joinDeliveryRoom.mockResolvedValue();

    let assignmentCallback: any;
    mockSocketService.onDeliveryAssigned.mockImplementation((callback) => {
      assignmentCallback = callback;
    });

    renderHook(() => useAssignmentListener());

    await waitFor(() => {
      expect(mockSocketService.onDeliveryAssigned).toHaveBeenCalled();
    });

    const mockAssignment = {
      orderId: 'order-123',
      orderData: {
        id: 'order-123',
        shopName: 'Shop 1',
        totalAmount: 50000,
        customerPhone: '9876543210',
        deliveryAddress: 'Address 1',
        items: [],
      },
      distanceKm: 2.5,
      estimatedPickupTime: 600,
      estimatedDeliveryTime: 900,
    };

    assignmentCallback(mockAssignment);

    await waitFor(() => {
      expect(mockAddPendingAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          distanceKm: 2.5,
        })
      );
    });
  });

  it('should return pending assignments count', () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    mockUseAssignmentStore.mockReturnValue({
      isListening: true,
      error: null,
      pendingAssignments: [
        { orderId: 'order-1' },
        { orderId: 'order-2' },
      ] as any,
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: jest.fn(),
    } as any);

    mockSocketService.getSocket.mockReturnValue({ connected: true } as any);
    mockSocketService.joinDeliveryRoom.mockResolvedValue();

    const { result } = renderHook(() => useAssignmentListener());

    expect(result.current.pendingCount).toBe(2);
  });

  it('should cleanup on unmount', async () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    mockUseAssignmentStore.mockReturnValue({
      isListening: true,
      error: null,
      pendingAssignments: [],
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: jest.fn(),
    } as any);

    mockSocketService.getSocket.mockReturnValue({ connected: true } as any);
    mockSocketService.joinDeliveryRoom.mockResolvedValue();

    const { unmount } = renderHook(() => useAssignmentListener());

    await waitFor(() => {
      expect(mockSocketService.joinDeliveryRoom).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockSocketService.offDeliveryAssigned).toHaveBeenCalled();
    });
  });
});
