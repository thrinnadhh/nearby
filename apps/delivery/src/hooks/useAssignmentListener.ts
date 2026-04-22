/**
 * Hook for listening to real-time delivery assignments via Socket.IO
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useAssignmentStore } from '@/store/assignment';
import {
  getSocket,
  onDeliveryAssigned,
  offDeliveryAssigned,
  joinDeliveryRoom,
  leaveDeliveryRoom,
} from '@/services/socket';
import { AssignmentAlert, SocketAssignmentEvent } from '@/types/assignment';
import logger from '@/utils/logger';

export function useAssignmentListener(): {
  isListening: boolean;
  error: string | null;
  pendingCount: number;
} {
  const partnerId = useAuthStore((state) => state.partnerId);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    isListening,
    error,
    pendingAssignments,
    setListening,
    setError,
    addPendingAssignment,
  } = useAssignmentStore();

  const handleAssignmentReceived = useCallback(
    (socketEvent: SocketAssignmentEvent) => {
      const assignment: AssignmentAlert = {
        orderId: socketEvent.orderId,
        orderData: socketEvent.orderData as any,
        assignedAt: new Date().toISOString(),
        distanceKm: socketEvent.distanceKm,
        estimatedPickupTime: socketEvent.estimatedPickupTime,
        estimatedDeliveryTime: socketEvent.estimatedDeliveryTime,
      };

      addPendingAssignment(assignment);
      logger.info('Assignment added to queue', {
        orderId: socketEvent.orderId,
      });
    },
    [addPendingAssignment]
  );

  useEffect(() => {
    if (!isAuthenticated || !partnerId || !token) {
      setListening(false);
      return;
    }

    const socket = getSocket();
    if (!socket?.connected) {
      logger.warn('Socket not connected, cannot listen for assignments');
      setError('Connection lost. Reconnecting...');
      return;
    }

    const startListening = async () => {
      try {
        // Join the delivery room for this partner
        await joinDeliveryRoom(partnerId);

        // Set up listener for new assignments
        onDeliveryAssigned(handleAssignmentReceived);

        setListening(true);
        setError(null);
        logger.info('Started listening for delivery assignments', { partnerId });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to start listening';
        logger.error('Failed to start listening for assignments', {
          partnerId,
          error: message,
        });
        setError(message);
        setListening(false);
      }
    };

    startListening();

    return () => {
      offDeliveryAssigned();
      leaveDeliveryRoom(partnerId).catch((err) => {
        logger.warn('Failed to leave delivery room', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
      setListening(false);
    };
  }, [isAuthenticated, partnerId, token, setListening, setError, handleAssignmentReceived]);

  return {
    isListening,
    error,
    pendingCount: pendingAssignments.length,
  };
}
