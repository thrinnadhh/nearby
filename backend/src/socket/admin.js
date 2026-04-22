import logger from '../utils/logger.js';

/**
 * Task 13.5.12: Register admin Socket.IO event handlers
 * Allows admin users to receive real-time notifications about:
 * - Order status changes (order:updated)
 * - Stuck order alerts (order:stuck-alert)
 * - Broadcast campaign status (broadcast:sent)
 */

export const registerAdmin = (_io, socket) => {
  // Check if user is admin before allowing join
  if (socket.role !== 'admin') {
    socket.emit('admin:error', {
      code: 'UNAUTHORIZED',
      message: 'Admin role required to join admin room.',
    });
    logger.warn('Non-admin user attempted to join admin room', {
      socketId: socket.id,
      userId: socket.userId,
      userRole: socket.userRole,
    });
    return;
  }

  // Admin joins the admin broadcast room
  socket.on('admin:join', () => {
    socket.join('admin');
    logger.info('Admin joined admin room', {
      socketId: socket.id,
      userId: socket.userId,
    });
    socket.emit('admin:joined', { room: 'admin' });
  });

  // Admin leaves the admin room
  socket.on('admin:leave', () => {
    socket.leave('admin');
    logger.info('Admin left admin room', {
      socketId: socket.id,
      userId: socket.userId,
    });
    socket.emit('admin:left', { room: 'admin' });
  });
};

/**
 * Broadcast order status update to all admins in the admin room
 * Called from: PATCH /orders/:id endpoints (when status changes)
 */
export const emitOrderUpdate = (io, { orderId, newStatus, customerId, shopId, updatedAt, eta = null }) => {
  if (!io) {
    logger.error('Socket.IO instance not available for order:updated event');
    return;
  }

  io.to('admin').emit('order:updated', {
    order_id: orderId,
    status: newStatus,
    customer_id: customerId,
    shop_id: shopId,
    updated_at: updatedAt,
    eta,
    timestamp: new Date().toISOString(),
  });

  logger.debug('Order update broadcasted to admin room', {
    orderId,
    newStatus,
    recipientRoom: 'admin',
  });
};

/**
 * Broadcast stuck order alert to all admins
 * Called from: BullMQ stuck-detection job (every 30 seconds)
 */
export const emitStuckAlert = (io, { orderId, status, stuckMinutes, customerPhone, shopId }) => {
  if (!io) {
    logger.error('Socket.IO instance not available for order:stuck-alert event');
    return;
  }

  io.to('admin').emit('order:stuck-alert', {
    order_id: orderId,
    status,
    stuck_minutes: stuckMinutes,
    customer_phone: customerPhone,
    shop_id: shopId,
    timestamp: new Date().toISOString(),
  });

  logger.warn('Stuck order alert broadcasted to admin room', {
    orderId,
    status,
    stuckMinutes,
  });
};

/**
 * Broadcast campaign sent status to admins
 * Called from: BullMQ broadcast-campaign job
 */
export const emitBroadcastStatus = (io, { broadcastId, status, sentCount, failedCount, totalTargets }) => {
  if (!io) {
    logger.error('Socket.IO instance not available for broadcast:sent event');
    return;
  }

  io.to('admin').emit('broadcast:sent', {
    broadcast_id: broadcastId,
    status, // 'queued', 'sending', 'completed', 'failed'
    sent_count: sentCount,
    failed_count: failedCount,
    total_targets: totalTargets,
    timestamp: new Date().toISOString(),
  });

  logger.info('Broadcast status sent to admin room', {
    broadcastId,
    status,
    sentCount,
    failedCount,
  });
};
