import logger from '../utils/logger.js';

const ORDER_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const registerOrderRoom = (_io, socket) => {
  socket.on('order:join', ({ orderId }) => {
    if (!orderId || !ORDER_ID_REGEX.test(orderId)) {
      socket.emit('order:error', { code: 'VALIDATION_ERROR', message: 'orderId must be a valid UUID.' });
      return;
    }

    socket.join(`order:${orderId}`);
    logger.debug('Socket joined order room', {
      socketId: socket.id,
      userId: socket.userId,
      orderId,
    });
    socket.emit('order:joined', { orderId, room: `order:${orderId}` });
  });

  socket.on('order:leave', ({ orderId }) => {
    if (!orderId) {
      return;
    }

    socket.leave(`order:${orderId}`);
    logger.debug('Socket left order room', {
      socketId: socket.id,
      userId: socket.userId,
      orderId,
    });
    socket.emit('order:left', { orderId, room: `order:${orderId}` });
  });
};
