import logger from '../utils/logger.js';

let realtimeServer = null;

export const setRealtimeServer = (io) => {
  realtimeServer = io;
};

export const getRealtimeServer = () => realtimeServer;

export const emitOrderEvent = (orderId, event, payload) => {
  if (!realtimeServer) {
    logger.debug('Realtime server not initialized; skipping order event emit', {
      orderId,
      event,
    });
    return;
  }

  realtimeServer.to(`order:${orderId}`).emit(event, payload);
};

/**
 * Emit an event to an arbitrary Socket.IO room.
 * Used by delivery jobs and GPS tracker for rooms beyond the order room pattern.
 * @param {string} room - Full room name, e.g. 'delivery:{partnerId}' or 'admin'
 * @param {string} event - Socket.IO event name
 * @param {Object} payload - Data to send
 */
export const emitToRoom = (room, event, payload) => {
  if (!realtimeServer) {
    logger.warn('emitToRoom: Socket.IO not initialised', { room, event });
    return;
  }
  realtimeServer.to(room).emit(event, payload);
};
