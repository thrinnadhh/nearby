/**
 * Assignment store — manages real-time delivery assignments
 * Listens to Socket.IO events and queues assignments for the partner
 */

import { create } from 'zustand';
import {
  AssignmentState,
  AssignmentActions,
  AssignmentAlert,
} from '@/types/assignment';
import logger from '@/utils/logger';

const initialState: AssignmentState = {
  currentAssignment: null,
  pendingAssignments: [],
  acceptedAssignments: [],
  isListening: false,
  error: null,
  lastUpdate: null,
};

export const useAssignmentStore = create<AssignmentState & AssignmentActions>(
  (set) => ({
    ...initialState,

    setCurrentAssignment: (assignment) => {
      logger.info('Current assignment updated', {
        orderId: assignment?.id,
      });
      set({
        currentAssignment: assignment,
        lastUpdate: new Date().toISOString(),
      });
    },

    addPendingAssignment: (assignment) => {
      logger.info('Pending assignment added', {
        orderId: assignment.orderId,
        distanceKm: assignment.distanceKm,
      });
      set((state) => ({
        pendingAssignments: [...state.pendingAssignments, assignment],
        lastUpdate: new Date().toISOString(),
      }));
    },

    removePendingAssignment: (orderId) => {
      logger.info('Pending assignment removed', { orderId });
      set((state) => ({
        pendingAssignments: state.pendingAssignments.filter(
          (a) => a.orderId !== orderId
        ),
        lastUpdate: new Date().toISOString(),
      }));
    },

    addAcceptedAssignment: (assignment) => {
      logger.info('Accepted assignment added', { orderId: assignment.orderId });
      set((state) => ({
        acceptedAssignments: [...state.acceptedAssignments, assignment],
        lastUpdate: new Date().toISOString(),
      }));
    },

    removeAcceptedAssignment: (orderId) => {
      logger.info('Accepted assignment removed', { orderId });
      set((state) => ({
        acceptedAssignments: state.acceptedAssignments.filter(
          (a) => a.orderId !== orderId
        ),
        lastUpdate: new Date().toISOString(),
      }));
    },

    setListening: (listening) => {
      logger.info('Assignment listening toggled', { listening });
      set({ isListening: listening });
    },

    setError: (error) => {
      if (error) {
        logger.error('Assignment error', { error });
      }
      set({ error });
    },

    setLastUpdate: (timestamp) => {
      set({ lastUpdate: timestamp });
    },

    clearAll: () => {
      logger.info('Assignment store cleared');
      set(initialState);
    },
  })
);
