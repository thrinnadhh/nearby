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
