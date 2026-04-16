import logger from '../utils/logger.js';

/**
 * Socket.IO Shop Status Handler
 * Broadcasts shop status changes (open/close) to all connected customers
 * Room: All customers (no specific room — broadcast to all)
 */

export function registerShopStatus(io, socket) {
  const { userId, role } = socket;

  if (!userId || !role) {
    logger.warn('Shop status handler: unauthenticated socket', { socketId: socket.id });
    return;
  }

  // Customers can listen but not emit
  // Shop owners emit via the backend route (PATCH /shops/:id/toggle)
  // The backend will broadcast to all customers

  logger.info('Shop status handler registered', {
    userId,
    role,
    socketId: socket.id,
  });
}

/**
 * Broadcast shop status change to all connected clients
 * Called from backend routes (e.g., PATCH /shops/:id/toggle)
 *
 * @param {Socket.IO Server} io
 * @param {string} shopId
 * @param {boolean} isOpen
 */
export function broadcastShopStatusChange(io, shopId, isOpen) {
  io.emit('shop-status-changed', {
    shopId,
    isOpen,
    changedAt: new Date().toISOString(),
  });

  logger.info('Broadcast shop status change', {
    shopId,
    isOpen,
  });
}

/**
 * Broadcast bulk shop status updates (useful for initial sync or batch updates)
 *
 * @param {Socket.IO Server} io
 * @param {Record<string, boolean>} updates - shopId -> isOpen
 */
export function broadcastShopStatusBatch(io, updates) {
  io.emit('shop-status-batch', {
    updates,
    updatedAt: new Date().toISOString(),
  });

  logger.info('Broadcast shop status batch', {
    shopCount: Object.keys(updates).length,
  });
}
