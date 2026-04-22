/**
 * Sprint 13.5.12: Admin Socket.IO Room
 * Tests: registerAdmin handler, emitOrderUpdate, emitStuckAlert, emitBroadcastStatus
 * Strategy: Pure unit tests — mock the socket object and io instance.
 *           Does NOT require a live Socket.IO server.
 * Target: 20+ tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Import the handler functions we want to test directly
import {
  registerAdmin,
  emitOrderUpdate,
  emitStuckAlert,
  emitBroadcastStatus,
} from '../../src/socket/admin.js';

// ─── Mock factory helpers ─────────────────────────────────────────────────────

/**
 * Build a minimal mock Socket object
 */
const makeSocket = (role = 'admin') => ({
  id: `socket-${uuidv4()}`,
  userId: uuidv4(),
  role,
  joinedRooms: new Set(),
  emit: jest.fn(),
  join: jest.fn(function (room) { this.joinedRooms.add(room); }),
  leave: jest.fn(function (room) { this.joinedRooms.delete(room); }),
  on: jest.fn(function (event, handler) {
    // Store handlers so we can trigger them manually
    if (!this._handlers) this._handlers = {};
    this._handlers[event] = handler;
  }),
  trigger: function (event, ...args) {
    if (this._handlers && this._handlers[event]) {
      this._handlers[event](...args);
    }
  },
  _handlers: {},
});

/**
 * Build a minimal mock io instance
 */
const makeIo = () => {
  const emittedEvents = [];
  return {
    to: jest.fn(() => ({
      emit: jest.fn((event, data) => emittedEvents.push({ event, data })),
    })),
    _emittedEvents: emittedEvents,
  };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin Socket.IO Room (Task 13.5.12)', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // registerAdmin handler
  // ══════════════════════════════════════════════════════════════════════════
  describe('registerAdmin handler', () => {

    it('1. emits admin:error for non-admin role (customer)', () => {
      const socket = makeSocket('customer');
      const io = makeIo();
      registerAdmin(io, socket);
      expect(socket.emit).toHaveBeenCalledWith(
        'admin:error',
        expect.objectContaining({ code: 'UNAUTHORIZED' })
      );
    });

    it('2. emits admin:error for non-admin role (shop_owner)', () => {
      const socket = makeSocket('shop_owner');
      const io = makeIo();
      registerAdmin(io, socket);
      expect(socket.emit).toHaveBeenCalledWith(
        'admin:error',
        expect.objectContaining({ code: 'UNAUTHORIZED' })
      );
    });

    it('3. emits admin:error for non-admin role (delivery)', () => {
      const socket = makeSocket('delivery');
      const io = makeIo();
      registerAdmin(io, socket);
      expect(socket.emit).toHaveBeenCalledWith(
        'admin:error',
        expect.objectContaining({ code: 'UNAUTHORIZED' })
      );
    });

    it('4. does NOT emit error for admin role', () => {
      const socket = makeSocket('admin');
      const io = makeIo();
      registerAdmin(io, socket);
      expect(socket.emit).not.toHaveBeenCalledWith(
        'admin:error',
        expect.anything()
      );
    });

    it('5. admin:error message contains human-readable text', () => {
      const socket = makeSocket('customer');
      registerAdmin(makeIo(), socket);
      const call = socket.emit.mock.calls.find(c => c[0] === 'admin:error');
      expect(call[1].message).toBeTruthy();
      expect(typeof call[1].message).toBe('string');
    });

    it('6. registers admin:join handler for admin socket', () => {
      const socket = makeSocket('admin');
      registerAdmin(makeIo(), socket);
      expect(socket.on).toHaveBeenCalledWith('admin:join', expect.any(Function));
    });

    it('7. registers admin:leave handler for admin socket', () => {
      const socket = makeSocket('admin');
      registerAdmin(makeIo(), socket);
      expect(socket.on).toHaveBeenCalledWith('admin:leave', expect.any(Function));
    });

    it('8. admin:join causes socket to join "admin" room', () => {
      const socket = makeSocket('admin');
      registerAdmin(makeIo(), socket);
      socket.trigger('admin:join');
      expect(socket.join).toHaveBeenCalledWith('admin');
    });

    it('9. admin:join emits admin:joined with { room: "admin" }', () => {
      const socket = makeSocket('admin');
      registerAdmin(makeIo(), socket);
      socket.trigger('admin:join');
      expect(socket.emit).toHaveBeenCalledWith('admin:joined', { room: 'admin' });
    });

    it('10. admin:leave causes socket to leave "admin" room', () => {
      const socket = makeSocket('admin');
      registerAdmin(makeIo(), socket);
      socket.trigger('admin:join');
      socket.trigger('admin:leave');
      expect(socket.leave).toHaveBeenCalledWith('admin');
    });

    it('11. admin:leave emits admin:left with { room: "admin" }', () => {
      const socket = makeSocket('admin');
      registerAdmin(makeIo(), socket);
      socket.trigger('admin:join');
      socket.trigger('admin:leave');
      expect(socket.emit).toHaveBeenCalledWith('admin:left', { room: 'admin' });
    });

    it('12. non-admin does NOT get admin:join handler registered', () => {
      const socket = makeSocket('customer');
      registerAdmin(makeIo(), socket);
      // on() should not have been called because handler returns early
      expect(socket.on).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // emitOrderUpdate
  // ══════════════════════════════════════════════════════════════════════════
  describe('emitOrderUpdate', () => {
    const orderId = uuidv4();
    const customerId = uuidv4();
    const shopId = uuidv4();

    it('13. emits to "admin" room', () => {
      const io = makeIo();
      emitOrderUpdate(io, {
        orderId, newStatus: 'accepted', customerId, shopId,
        updatedAt: new Date().toISOString(),
      });
      expect(io.to).toHaveBeenCalledWith('admin');
    });

    it('14. broadcast payload has order_id', () => {
      const io = makeIo();
      emitOrderUpdate(io, {
        orderId, newStatus: 'accepted', customerId, shopId,
        updatedAt: new Date().toISOString(),
      });
      const emitted = io._emittedEvents.find(e => e.event === 'order:updated');
      expect(emitted.data.order_id).toBe(orderId);
    });

    it('15. broadcast payload has status', () => {
      const io = makeIo();
      emitOrderUpdate(io, {
        orderId, newStatus: 'delivered', customerId, shopId,
        updatedAt: new Date().toISOString(),
      });
      const emitted = io._emittedEvents.find(e => e.event === 'order:updated');
      expect(emitted.data.status).toBe('delivered');
    });

    it('16. broadcast payload has customer_id, shop_id, updated_at, timestamp', () => {
      const updatedAt = new Date().toISOString();
      const io = makeIo();
      emitOrderUpdate(io, { orderId, newStatus: 'packing', customerId, shopId, updatedAt });
      const emitted = io._emittedEvents.find(e => e.event === 'order:updated');
      expect(emitted.data).toHaveProperty('customer_id', customerId);
      expect(emitted.data).toHaveProperty('shop_id', shopId);
      expect(emitted.data).toHaveProperty('updated_at', updatedAt);
      expect(emitted.data).toHaveProperty('timestamp');
    });

    it('17. handles missing io without throwing', () => {
      expect(() => emitOrderUpdate(null, {
        orderId, newStatus: 'accepted', customerId, shopId,
        updatedAt: new Date().toISOString(),
      })).not.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // emitStuckAlert
  // ══════════════════════════════════════════════════════════════════════════
  describe('emitStuckAlert', () => {
    const orderId = uuidv4();
    const shopId = uuidv4();

    it('18. emits order:stuck-alert to "admin" room', () => {
      const io = makeIo();
      emitStuckAlert(io, {
        orderId, status: 'pending', stuckMinutes: 5,
        customerPhone: '+919876543210', shopId,
      });
      expect(io.to).toHaveBeenCalledWith('admin');
      const emitted = io._emittedEvents.find(e => e.event === 'order:stuck-alert');
      expect(emitted).toBeDefined();
    });

    it('19. stuck-alert payload has required fields', () => {
      const io = makeIo();
      emitStuckAlert(io, {
        orderId, status: 'pending', stuckMinutes: 5,
        customerPhone: '+919876543210', shopId,
      });
      const emitted = io._emittedEvents.find(e => e.event === 'order:stuck-alert');
      expect(emitted.data).toHaveProperty('order_id', orderId);
      expect(emitted.data).toHaveProperty('status', 'pending');
      expect(emitted.data).toHaveProperty('stuck_minutes', 5);
      expect(emitted.data).toHaveProperty('customer_phone');
      expect(emitted.data).toHaveProperty('shop_id', shopId);
      expect(emitted.data).toHaveProperty('timestamp');
    });

    it('20. handles missing io without throwing', () => {
      expect(() => emitStuckAlert(null, {
        orderId, status: 'pending', stuckMinutes: 5,
        customerPhone: '+919876543210', shopId,
      })).not.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // emitBroadcastStatus
  // ══════════════════════════════════════════════════════════════════════════
  describe('emitBroadcastStatus', () => {
    const broadcastId = uuidv4();

    it('21. emits broadcast:sent to "admin" room', () => {
      const io = makeIo();
      emitBroadcastStatus(io, {
        broadcastId, status: 'completed',
        sentCount: 100, failedCount: 2, totalTargets: 102,
      });
      expect(io.to).toHaveBeenCalledWith('admin');
      const emitted = io._emittedEvents.find(e => e.event === 'broadcast:sent');
      expect(emitted).toBeDefined();
    });

    it('22. broadcast:sent payload has all required fields', () => {
      const io = makeIo();
      emitBroadcastStatus(io, {
        broadcastId, status: 'completed',
        sentCount: 100, failedCount: 2, totalTargets: 102,
      });
      const emitted = io._emittedEvents.find(e => e.event === 'broadcast:sent');
      expect(emitted.data).toHaveProperty('broadcast_id', broadcastId);
      expect(emitted.data).toHaveProperty('status', 'completed');
      expect(emitted.data).toHaveProperty('sent_count', 100);
      expect(emitted.data).toHaveProperty('failed_count', 2);
      expect(emitted.data).toHaveProperty('total_targets', 102);
      expect(emitted.data).toHaveProperty('timestamp');
    });

    it('23. handles missing io without throwing', () => {
      expect(() => emitBroadcastStatus(null, {
        broadcastId, status: 'failed',
        sentCount: 0, failedCount: 10, totalTargets: 10,
      })).not.toThrow();
    });
  });
});
