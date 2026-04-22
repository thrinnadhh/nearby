/**
 * Integration tests for complete assignment flow
 */

import { useAssignmentStore } from '@/store/assignment';
import { useAuthStore } from '@/store/auth';
import * as assignmentService from '@/services/assignment';
import * as socketService from '@/services/socket';
import { AssignmentAlert } from '@/types/assignment';

jest.mock('@/services/assignment');
jest.mock('@/services/socket');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockAssignmentService = assignmentService as jest.Mocked<
  typeof assignmentService
>;
const mockSocketService = socketService as jest.Mocked<typeof socketService>;

describe('Assignment Flow Integration', () => {
  const mockAssignment: AssignmentAlert = {
    orderId: 'order-123',
    orderData: {
      id: 'order-123',
      customerId: 'cust-123',
      shopId: 'shop-123',
      shopName: 'Test Shop',
      totalAmount: 50000,
      status: 'assigned',
      customerPhone: '9876543210',
      deliveryAddress: '123 Main St',
      deliveryLat: 17.36,
      deliveryLng: 78.47,
      pickupLat: 17.35,
      pickupLng: 78.46,
      items: [{ id: 'item-1', productName: 'Product 1', quantity: 1, price: 50000 }],
      createdAt: new Date().toISOString(),
    },
    assignedAt: new Date().toISOString(),
    distanceKm: 2.5,
    estimatedPickupTime: 600,
    estimatedDeliveryTime: 900,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAssignmentStore.setState({
      currentAssignment: null,
      pendingAssignments: [],
      acceptedAssignments: [],
      isListening: false,
      error: null,
      lastUpdate: null,
    });
    useAuthStore.setState({
      isAuthenticated: true,
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      token: 'jwt-token-123',
      role: 'delivery',
    });
  });

  it('should complete full assignment flow: receive → accept → pickup → deliver', async () => {
    // Step 1: Receive assignment (simulated Socket.IO event)
    useAssignmentStore.getState().addPendingAssignment(mockAssignment);

    let state = useAssignmentStore.getState();
    expect(state.pendingAssignments).toHaveLength(1);

    // Step 2: Set as current assignment
    useAssignmentStore.getState().setCurrentAssignment(mockAssignment);

    state = useAssignmentStore.getState();
    expect(state.currentAssignment).toEqual(mockAssignment);

    // Step 3: Accept assignment
    mockAssignmentService.acceptAssignment.mockResolvedValue({
      id: mockAssignment.orderId,
      status: 'assigned',
    });

    await assignmentService.acceptAssignment(mockAssignment.orderId);

    useAssignmentStore.getState().addAcceptedAssignment(mockAssignment);
    useAssignmentStore.getState().removePendingAssignment(mockAssignment.orderId);
    useAssignmentStore.getState().setCurrentAssignment(null);

    state = useAssignmentStore.getState();
    expect(state.acceptedAssignments).toHaveLength(1);
    expect(state.pendingAssignments).toHaveLength(0);
    expect(state.currentAssignment).toBeNull();

    // Step 4: Mark as picked up
    mockAssignmentService.markPickedUp.mockResolvedValue({
      id: mockAssignment.orderId,
      status: 'picked_up',
    });

    await assignmentService.markPickedUp(mockAssignment.orderId);
    expect(mockAssignmentService.markPickedUp).toHaveBeenCalledWith(
      'order-123'
    );

    // Step 5: Mark as delivered
    mockAssignmentService.markDelivered.mockResolvedValue({
      id: mockAssignment.orderId,
      status: 'delivered',
    });

    await assignmentService.markDelivered(mockAssignment.orderId);
    expect(mockAssignmentService.markDelivered).toHaveBeenCalledWith(
      'order-123'
    );

    // Step 6: Remove from accepted assignments
    useAssignmentStore.getState().removeAcceptedAssignment(mockAssignment.orderId);

    state = useAssignmentStore.getState();
    expect(state.acceptedAssignments).toHaveLength(0);
  });

  it('should handle rejection and reset assignment', async () => {
    // Step 1: Receive assignment
    useAssignmentStore.getState().addPendingAssignment(mockAssignment);
    useAssignmentStore.getState().setCurrentAssignment(mockAssignment);

    let state = useAssignmentStore.getState();
    expect(state.currentAssignment).toEqual(mockAssignment);

    // Step 2: Reject assignment
    mockAssignmentService.rejectAssignment.mockResolvedValue({
      id: mockAssignment.orderId,
      status: 'ready',
    });

    await assignmentService.rejectAssignment(mockAssignment.orderId);

    useAssignmentStore.getState().removePendingAssignment(mockAssignment.orderId);
    useAssignmentStore.getState().setCurrentAssignment(null);

    state = useAssignmentStore.getState();
    expect(state.pendingAssignments).toHaveLength(0);
    expect(state.currentAssignment).toBeNull();
  });

  it('should handle multiple assignments in queue', async () => {
    const assignment1 = {
      ...mockAssignment,
      orderId: 'order-1',
      orderData: { ...mockAssignment.orderData, id: 'order-1', shopName: 'Shop 1' },
    };

    const assignment2 = {
      ...mockAssignment,
      orderId: 'order-2',
      orderData: { ...mockAssignment.orderData, id: 'order-2', shopName: 'Shop 2' },
    };

    // Step 1: Add multiple assignments
    useAssignmentStore.getState().addPendingAssignment(assignment1);
    useAssignmentStore.getState().addPendingAssignment(assignment2);

    let state = useAssignmentStore.getState();
    expect(state.pendingAssignments).toHaveLength(2);

    // Step 2: Accept first assignment
    useAssignmentStore.getState().setCurrentAssignment(assignment1);
    mockAssignmentService.acceptAssignment.mockResolvedValue({
      id: 'order-1',
      status: 'assigned',
    });

    await assignmentService.acceptAssignment('order-1');
    useAssignmentStore.getState().addAcceptedAssignment(assignment1);
    useAssignmentStore.getState().removePendingAssignment('order-1');
    useAssignmentStore.getState().setCurrentAssignment(null);

    state = useAssignmentStore.getState();
    expect(state.acceptedAssignments).toHaveLength(1);
    expect(state.pendingAssignments).toHaveLength(1);

    // Step 3: Accept second assignment
    useAssignmentStore.getState().setCurrentAssignment(assignment2);
    mockAssignmentService.acceptAssignment.mockResolvedValue({
      id: 'order-2',
      status: 'assigned',
    });

    await assignmentService.acceptAssignment('order-2');
    useAssignmentStore.getState().addAcceptedAssignment(assignment2);
    useAssignmentStore.getState().removePendingAssignment('order-2');
    useAssignmentStore.getState().setCurrentAssignment(null);

    state = useAssignmentStore.getState();
    expect(state.acceptedAssignments).toHaveLength(2);
    expect(state.pendingAssignments).toHaveLength(0);
  });

  it('should track listening state and errors', async () => {
    // Start listening
    useAssignmentStore.getState().setListening(true);

    let state = useAssignmentStore.getState();
    expect(state.isListening).toBe(true);

    // Simulate error
    useAssignmentStore.getState().setError('Connection failed');

    state = useAssignmentStore.getState();
    expect(state.error).toBe('Connection failed');

    // Clear error
    useAssignmentStore.getState().setError(null);

    state = useAssignmentStore.getState();
    expect(state.error).toBeNull();
  });

  it('should clear all assignments on logout', async () => {
    // Add assignments
    useAssignmentStore.getState().addPendingAssignment(mockAssignment);
    useAssignmentStore.getState().addAcceptedAssignment(mockAssignment);
    useAssignmentStore.getState().setListening(true);

    let state = useAssignmentStore.getState();
    expect(state.pendingAssignments).toHaveLength(1);
    expect(state.acceptedAssignments).toHaveLength(1);
    expect(state.isListening).toBe(true);

    // Clear all
    useAssignmentStore.getState().clearAll();

    state = useAssignmentStore.getState();
    expect(state.currentAssignment).toBeNull();
    expect(state.pendingAssignments).toHaveLength(0);
    expect(state.acceptedAssignments).toHaveLength(0);
    expect(state.isListening).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should update timestamp on state changes', async () => {
    let state = useAssignmentStore.getState();
    const initialTime = state.lastUpdate;

    // Add assignment
    useAssignmentStore.getState().addPendingAssignment(mockAssignment);

    state = useAssignmentStore.getState();
    expect(state.lastUpdate).not.toEqual(initialTime);
    const afterAddTime = state.lastUpdate;

    // Wait a moment to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Remove assignment
    useAssignmentStore.getState().removePendingAssignment(mockAssignment.orderId);

    state = useAssignmentStore.getState();
    expect(state.lastUpdate).not.toEqual(afterAddTime);
  });

  it('should handle assignment acceptance failure gracefully', async () => {
    useAssignmentStore.getState().setCurrentAssignment(mockAssignment);

    mockAssignmentService.acceptAssignment.mockRejectedValue(
      new Error('Network error')
    );

    try {
      await assignmentService.acceptAssignment(mockAssignment.orderId);
    } catch (err) {
      expect(err).toBeDefined();
    }

    // Assignment should still be pending
    const state = useAssignmentStore.getState();
    expect(state.acceptedAssignments).toHaveLength(0);
  });
});
