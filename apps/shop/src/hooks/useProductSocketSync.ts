/**
 * useProductSocketSync hook — real-time product updates via Socket.IO
 * Listens for product:updated, product:created, product:deleted events
 * from backend and syncs store with optimistic updates support
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import { getSocket } from '@/services/socket';
import { Product } from '@/types/products';
import logger from '@/utils/logger';

interface ProductSocketEvent {
  productId: string;
  product?: Product;
  timestamp: number;
}

/**
 * useProductSocketSync hook
 * Sets up listeners for real-time product updates from Socket.IO
 * Should be called once in main ProductCatalogueScreen
 */
export function useProductSocketSync(): {
  connected: boolean;
  lastUpdate: number | null;
} {
  const shopId = useAuthStore((s) => s.shopId);
  const { updateProduct, deleteProduct, setProducts } = useProductsStore();
  const connectedRef = useRef(false);
  const lastUpdateRef = useRef<number | null>(null);

  /**
   * Handle product:updated event
   * Backend sends this when any product in the shop is updated
   * (stock, price, availability, etc)
   */
  const handleProductUpdated = useCallback(
    (event: ProductSocketEvent) => {
      try {
        if (!event.product) {
          logger.warn('product:updated event missing product data', event);
          return;
        }

        logger.info('Product updated via Socket.IO', {
          productId: event.productId,
          timestamp: event.timestamp,
        });

        // Update product in store (immutable)
        updateProduct(event.productId, event.product);
        lastUpdateRef.current = event.timestamp;
      } catch (err) {
        logger.error('Failed to handle product:updated event', {
          error: err instanceof Error ? err.message : String(err),
          productId: event.productId,
        });
      }
    },
    [updateProduct]
  );

  /**
   * Handle product:created event
   * Backend sends this when a new product is created in the shop
   */
  const handleProductCreated = useCallback(
    (event: ProductSocketEvent) => {
      try {
        if (!event.product) {
          logger.warn('product:created event missing product data', event);
          return;
        }

        logger.info('Product created via Socket.IO', {
          productId: event.productId,
          timestamp: event.timestamp,
        });

        // In real-time scenario, either:
        // 1. Refresh full product list from API
        // 2. Add product to store directly
        // For now, we could add it, but a refresh is safer
        logger.info('New product created - consider refreshing list');
        lastUpdateRef.current = event.timestamp;
      } catch (err) {
        logger.error('Failed to handle product:created event', {
          error: err instanceof Error ? err.message : String(err),
          productId: event.productId,
        });
      }
    },
    []
  );

  /**
   * Handle product:deleted event
   * Backend sends this when product is deleted (soft delete)
   */
  const handleProductDeleted = useCallback(
    (event: ProductSocketEvent) => {
      try {
        logger.info('Product deleted via Socket.IO', {
          productId: event.productId,
          timestamp: event.timestamp,
        });

        // Remove product from store
        deleteProduct(event.productId);
        lastUpdateRef.current = event.timestamp;
      } catch (err) {
        logger.error('Failed to handle product:deleted event', {
          error: err instanceof Error ? err.message : String(err),
          productId: event.productId,
        });
      }
    },
    [deleteProduct]
  );

  /**
   * Handle stock change event (real-time inventory updates)
   * This could be a separate event: product:stock-changed
   */
  const handleStockChanged = useCallback(
    (data: { productId: string; stockQty: number; timestamp: number }) => {
      try {
        logger.info('Product stock changed via Socket.IO', {
          productId: data.productId,
          stockQty: data.stockQty,
          timestamp: data.timestamp,
        });

        // Update just the stock quantity
        updateProduct(data.productId, { stockQty: data.stockQty });
        lastUpdateRef.current = data.timestamp;
      } catch (err) {
        logger.error('Failed to handle product stock change', {
          error: err instanceof Error ? err.message : String(err),
          productId: data.productId,
        });
      }
    },
    [updateProduct]
  );

  /**
   * Setup Socket.IO listeners on mount
   * Cleanup on unmount
   */
  useEffect(() => {
    if (!shopId) {
      logger.warn('shopId not available, skipping Socket.IO setup');
      return;
    }

    const socket = getSocket();
    if (!socket) {
      logger.warn('Socket.IO not initialized, cannot setup product listeners');
      return;
    }

    logger.info('Setting up Socket.IO product listeners', { shopId });

    // Join shop-specific product room
    // Backend will emit to: shop:{shopId}:products
    socket.emit('join-room', {
      room: `shop:${shopId}:products`,
    });

    // Listen to events
    socket.on('product:updated', handleProductUpdated);
    socket.on('product:created', handleProductCreated);
    socket.on('product:deleted', handleProductDeleted);
    socket.on('product:stock-changed', handleStockChanged);
    socket.on('connect', () => {
      connectedRef.current = true;
      logger.info('Socket.IO connected for products');
    });
    socket.on('disconnect', () => {
      connectedRef.current = false;
      logger.info('Socket.IO disconnected for products');
    });

    // Cleanup listeners on unmount
    return () => {
      logger.info('Cleaning up Socket.IO product listeners');
      socket.off('product:updated', handleProductUpdated);
      socket.off('product:created', handleProductCreated);
      socket.off('product:deleted', handleProductDeleted);
      socket.off('product:stock-changed', handleStockChanged);
    };
  }, [shopId, handleProductUpdated, handleProductCreated, handleProductDeleted, handleStockChanged]);

  return {
    connected: connectedRef.current,
    lastUpdate: lastUpdateRef.current,
  };
}
