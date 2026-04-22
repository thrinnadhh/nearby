/**
 * Unit tests for assignment store
 */

import { useAssignmentStore } from '@/store/assignment';
import { AssignmentAlert } from '@/types/assignment';

describe('Assignment Store', () => {
  beforeEach(() => {
    useAssignmentStore.setState({
      currentAssignment: null,
      pendingAssignments: [],
      acceptedAssignments: [],
      isListening: false,
      error: null,
      lastUpdate: null,
    });
  });

  describe('setCurrentAssignment', () => {
    it('should set current assignment', () => {
      const assignment: AssignmentAlert = {
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
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 2.5,
        estimatedPickupTime: 600,
        estimatedDeliveryTime: 900,
      };

      useAssignmentStore.getState().setCurrentAssignment(assignment);

      const state = useAssignmentStore.getState();
      expect(state.currentAssignment).toEqual(assignment);
      expect(state.lastUpdate).toBeTruthy();
    });

    it('should set current assignment to null', () => {
      useAssignmentStore.getState().setCurrentAssignment(null);

      const state = useAssignmentStore.getState();
      expect(state.currentAssignment).toBeNull();
    });
  });

  describe('addPendingAssignment', () => {
    it('should add assignment to pending list', () => {
      const assignment: AssignmentAlert = {
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
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 2.5,
        estimatedPickupTime: 600,
        estimatedDeliveryTime: 900,
      };

      useAssignmentStore.getState().addPendingAssignment(assignment);

      const state = useAssignmentStore.getState();
      expect(state.pendingAssignments).toHaveLength(1);
      expect(state.pendingAssignments[0]).toEqual(assignment);
    });

    it('should add multiple assignments', () => {
      const assignment1: AssignmentAlert = {
        orderId: 'order-1',
        orderData: {
          id: 'order-1',
          customerId: 'cust-1',
          shopId: 'shop-1',
          shopName: 'Shop 1',
          totalAmount: 50000,
          status: 'assigned',
          customerPhone: '9876543210',
          deliveryAddress: 'Address 1',
          deliveryLat: 17.36,
          deliveryLng: 78.47,
          pickupLat: 17.35,
          pickupLng: 78.46,
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 2.5,
        estimatedPickupTime: 600,
        estimatedDeliveryTime: 900,
      };

      const assignment2: AssignmentAlert = {
        orderId: 'order-2',
        orderData: {
          id: 'order-2',
          customerId: 'cust-2',
          shopId: 'shop-2',
          shopName: 'Shop 2',
          totalAmount: 60000,
          status: 'assigned',
          customerPhone: '9876543211',
          deliveryAddress: 'Address 2',
          deliveryLat: 17.37,
          deliveryLng: 78.48,
          pickupLat: 17.36,
          pickupLng: 78.47,
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 3.5,
        estimatedPickupTime: 700,
        estimatedDeliveryTime: 1000,
      };

      useAssignmentStore.getState().addPendingAssignment(assignment1);
      useAssignmentStore.getState().addPendingAssignment(assignment2);

      const state = useAssignmentStore.getState();
      expect(state.pendingAssignments).toHaveLength(2);
    });
  });

  describe('removePendingAssignment', () => {
    it('should remove assignment from pending list', () => {
      const assignment: AssignmentAlert = {
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
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 2.5,
        estimatedPickupTime: 600,
        estimatedDeliveryTime: 900,
      };

      useAssignmentStore.getState().addPendingAssignment(assignment);
      expect(useAssignmentStore.getState().pendingAssignments).toHaveLength(1);

      useAssignmentStore.getState().removePendingAssignment('order-123');
      expect(useAssignmentStore.getState().pendingAssignments).toHaveLength(0);
    });
  });

  describe('addAcceptedAssignment', () => {
    it('should add assignment to accepted list', () => {
      const assignment: AssignmentAlert = {
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
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 2.5,
        estimatedPickupTime: 600,
        estimatedDeliveryTime: 900,
      };

      useAssignmentStore.getState().addAcceptedAssignment(assignment);

      const state = useAssignmentStore.getState();
      expect(state.acceptedAssignments).toHaveLength(1);
      expect(state.acceptedAssignments[0]).toEqual(assignment);
    });
  });

  describe('removeAcceptedAssignment', () => {
    it('should remove assignment from accepted list', () => {
      const assignment: AssignmentAlert = {
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
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 2.5,
        estimatedPickupTime: 600,
        estimatedDeliveryTime: 900,
      };

      useAssignmentStore.getState().addAcceptedAssignment(assignment);
      useAssignmentStore.getState().removeAcceptedAssignment('order-123');

      expect(useAssignmentStore.getState().acceptedAssignments).toHaveLength(0);
    });
  });

  describe('setListening', () => {
    it('should update listening status', () => {
      useAssignmentStore.getState().setListening(true);
      expect(useAssignmentStore.getState().isListening).toBe(true);

      useAssignmentStore.getState().setListening(false);
      expect(useAssignmentStore.getState().isListening).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useAssignmentStore.getState().setError('Test error');
      expect(useAssignmentStore.getState().error).toBe('Test error');
    });

    it('should clear error message', () => {
      useAssignmentStore.getState().setError('Test error');
      useAssignmentStore.getState().setError(null);
      expect(useAssignmentStore.getState().error).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should reset store to initial state', () => {
      const assignment: AssignmentAlert = {
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
          items: [],
          createdAt: new Date().toISOString(),
        },
        assignedAt: new Date().toISOString(),
        distanceKm: 2.5,
        estimatedPickupTime: 600,
        estimatedDeliveryTime: 900,
      };

      useAssignmentStore.getState().addPendingAssignment(assignment);
      useAssignmentStore.getState().setListening(true);
      useAssignmentStore.getState().setError('Test error');

      useAssignmentStore.getState().clearAll();

      const state = useAssignmentStore.getState();
      expect(state.currentAssignment).toBeNull();
      expect(state.pendingAssignments).toEqual([]);
      expect(state.acceptedAssignments).toEqual([]);
      expect(state.isListening).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
