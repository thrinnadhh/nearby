import { redis } from '../services/redis.js';
import { supabase } from '../services/supabase.js';
import { getETA } from '../services/olaMaps.js';
import logger from '../utils/logger.js';

// India bounding box — hard validation boundary
const INDIA_LAT_MIN = 6.0;
const INDIA_LAT_MAX = 37.6;
const INDIA_LNG_MIN = 68.1;
const INDIA_LNG_MAX = 97.4;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true only if lat/lng are numbers within Indian geographic bounds.
 */
function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number'
    && typeof lng === 'number'
    && lat >= INDIA_LAT_MIN
    && lat <= INDIA_LAT_MAX
    && lng >= INDIA_LNG_MIN
    && lng <= INDIA_LNG_MAX
  );
}

/**
 * Register the GPS tracker socket event handlers for a connected delivery partner.
 *
 * Domain rules enforced here:
 * - GPS NEVER written to Supabase — Redis GEOADD with 30s TTL only
 * - ETA computed via Ola Maps — never Google Maps
 * - Ownership checked: only the assigned partner may emit updates for an order
 * - Status guard: only picked_up and out_for_delivery accept GPS updates
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {import('socket.io').Socket} socket - Authenticated socket connection
 */
export function registerGpsTracker(io, socket) {
  socket.on('gps:update', async ({ orderId, lat, lng } = {}) => {
    try {
      // 0. Role guard — only delivery partners may emit GPS
      if (socket.role !== 'delivery') {
        socket.emit('gps:error', { code: 'FORBIDDEN', message: 'Not authorized.' });
        return;
      }

      // 1. Validate inputs — orderId must be a valid UUID v4
      if (!orderId || !UUID_RE.test(orderId) || !isValidCoord(lat, lng)) {
        socket.emit('gps:error', {
          code: 'VALIDATION_ERROR',
          message: `orderId (UUID), lat (${INDIA_LAT_MIN}–${INDIA_LAT_MAX}), and lng (${INDIA_LNG_MIN}–${INDIA_LNG_MAX}) are required.`,
        });
        return;
      }

      // 2. Fetch order (single DB read — only fields needed)
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('id, delivery_partner_id, status, customer_id, shop_id')
        .eq('id', orderId)
        .single();

      if (orderErr || !order) {
        socket.emit('gps:error', {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found.',
        });
        return;
      }

      // 3. Ownership check — only the assigned partner may push GPS for this order
      if (order.delivery_partner_id !== socket.userId) {
        socket.emit('gps:error', {
          code: 'FORBIDDEN',
          message: 'Not your order.',
        });
        return;
      }

      // 4. Status check — GPS only accepted while order is in active transit
      const validStatuses = ['picked_up', 'out_for_delivery'];
      if (!validStatuses.includes(order.status)) {
        socket.emit('gps:error', {
          code: 'INVALID_ORDER_STATUS',
          message: `GPS updates not accepted for orders in '${order.status}' status.`,
        });
        return;
      }

      // 5. Store GPS in Redis — GEOADD key lng lat member (Redis lng,lat order)
      //    TTL 30s enforced per domain rules — never written to Supabase
      await redis.call(
        'GEOADD',
        `delivery:${orderId}`,
        String(lng),
        String(lat),
        socket.userId
      );
      await redis.expire(`delivery:${orderId}`, 30);

      // 6. Best-effort ETA via Ola Maps Distance Matrix (destination = shop for pickup ETA)
      let eta = null;
      try {
        const { data: shop } = await supabase
          .from('shops')
          .select('latitude, longitude')
          .eq('id', order.shop_id)
          .single();

        if (shop?.latitude != null && shop?.longitude != null) {
          eta = await getETA(lat, lng, Number(shop.latitude), Number(shop.longitude));
        }
      } catch (etaErr) {
        logger.warn('gpsTracker: ETA computation failed', {
          error: etaErr.message,
          orderId,
        });
        // eta remains null — broadcast proceeds without ETA
      }

      // 7. Broadcast position to all room members (customer, shop, delivery)
      io.to(`order:${orderId}`).emit('gps:position', {
        lat,
        lng,
        eta,
        timestamp: Date.now(),
      });

      logger.debug('gpsTracker: position updated', {
        orderId,
        userId: socket.userId,
      });
    } catch (err) {
      logger.error('gpsTracker: unexpected error', {
        error: err.message,
        orderId,
        socketId: socket.id,
      });
      socket.emit('gps:error', {
        code: 'INTERNAL_ERROR',
        message: 'GPS update failed.',
      });
    }
  });
}
