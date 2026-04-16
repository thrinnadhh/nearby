import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ordersAPI from '@/services/orders';
import { useCartStore } from '@/store/cart';
import { useOrdersStore } from '@/store/orders';
import type { Order, Product } from '@/types';

// Mock axios
vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  client: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Orders Service - Task 10.2 getOrderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch order detail with token', async () => {
    const mockOrder: Order = {
      id: 'order-123',
      shop_id: 'shop-123',
      shop_name: 'Fresh Kirana',
      status: 'delivered',
      total_paise: 50000,
      items: [],
      payment_method: 'upi',
      created_at: '2026-04-16T10:30:00Z',
    };

    const { client } = await import('@/services/api');
    (client.get as any).mockResolvedValue({
      data: {
        success: true,
        data: mockOrder,
      },
    });

    const result = await ordersAPI.getOrderDetail('order-123', 'token-123');
    expect(result).toEqual(mockOrder);
  });

  it('should throw error if API returns error', async () => {
    const { client } = await import('@/services/api');
    (client.get as any).mockResolvedValue({
      data: {
        success: false,
        error: { message: 'Order not found' },
      },
    });

    await expect(
      ordersAPI.getOrderDetail('order-456', 'token-123')
    ).rejects.toThrow('Order not found');
  });

  it('should include authorization header with token', async () => {
    const { client } = await import('@/services/api');
    (client.get as any).mockResolvedValue({
      data: {
        success: true,
        data: { id: 'order-123' },
      },
    });

    await ordersAPI.getOrderDetail('order-123', 'token-abc');

    expect(client.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-abc' },
      })
    );
  });
});

describe('Orders Service - Task 10.3 cancelOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel order with reason', async () => {
    const { client } = await import('@/services/api');
    (client.patch as any).mockResolvedValue({
      data: { success: true },
    });

    await ordersAPI.cancelOrder('order-123', 'I changed my mind', 'token-123');

    expect(client.patch).toHaveBeenCalledWith(
      '/api/v1/orders/order-123/cancel',
      { reason: 'I changed my mind' },
      expect.any(Object)
    );
  });

  it('should throw error if cancellation fails', async () => {
    const { client } = await import('@/services/api');
    (client.patch as any).mockResolvedValue({
      data: {
        success: false,
        error: { message: 'Order already shipped' },
      },
    });

    await expect(
      ordersAPI.cancelOrder('order-123', 'I changed my mind', 'token-123')
    ).rejects.toThrow('Order already shipped');
  });

  it('should handle custom reasons', async () => {
    const { client } = await import('@/services/api');
    (client.patch as any).mockResolvedValue({
      data: { success: true },
    });

    const customReason = 'The product quality is poor';
    await ordersAPI.cancelOrder('order-123', customReason, 'token-123');

    expect(client.patch).toHaveBeenCalledWith(
      expect.any(String),
      { reason: customReason },
      expect.any(Object)
    );
  });
});

describe('Orders Service - Task 10.4 reorderFromOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reorder from previous order', async () => {
    const { client } = await import('@/services/api');
    (client.post as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          new_order_id: 'order-456',
          unavailable_items: [],
          price_changes: [],
        },
      },
    });

    const result = await ordersAPI.reorderFromOrder(
      'order-123',
      'My delivery address',
      [12.9716, 77.5946],
      'token-123'
    );

    expect(result.newOrderId).toBe('order-456');
    expect(result.unavailableItems).toEqual([]);
  });

  it('should handle unavailable items', async () => {
    const { client } = await import('@/services/api');
    (client.post as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          order_id: 'order-456',
          unavailable_items: ['prod-1', 'prod-2'],
          price_changes: [
            {
              product_id: 'prod-3',
              old_price: 10000,
              new_price: 12000,
            },
          ],
        },
      },
    });

    const result = await ordersAPI.reorderFromOrder(
      'order-123',
      'Address',
      [12.9716, 77.5946],
      'token-123'
    );

    expect(result.unavailableItems).toContain('prod-1');
    expect(result.priceChanges[0].productId).toBe('prod-3');
  });

  it('should throw error on reorder failure', async () => {
    const { client } = await import('@/services/api');
    (client.post as any).mockResolvedValue({
      data: {
        success: false,
        error: { message: 'Shop is closed' },
      },
    });

    await expect(
      ordersAPI.reorderFromOrder(
        'order-123',
        'Address',
        [12.9716, 77.5946],
        'token-123'
      )
    ).rejects.toThrow('Shop is closed');
  });
});

describe('Cart Store - Task 10.4 reorderItems', () => {
  beforeEach(() => {
    const cartStore = useCartStore.getState();
    cartStore.clearCart();
  });

  it('should prefill cart with reorder items', () => {
    const mockProducts: Product[] = [
      {
        id: 'prod-1',
        shop_id: 'shop-123',
        name: 'Milk',
        price: 10000,
        stock_qty: 100,
        image_url: null,
        category: 'dairy',
        is_available: true,
      },
      {
        id: 'prod-2',
        shop_id: 'shop-123',
        name: 'Bread',
        price: 8000,
        stock_qty: 50,
        image_url: null,
        category: 'bakery',
        is_available: true,
      },
    ];

    const reorderItems = [
      { product_id: 'prod-1', qty: 2 },
      { product_id: 'prod-2', qty: 1 },
    ];

    const cartStore = useCartStore.getState();
    cartStore.reorderItems(mockProducts, reorderItems, 'shop-123');

    const state = useCartStore.getState();
    expect(state.shopId).toBe('shop-123');
    expect(state.items).toHaveLength(2);
    expect(state.items[0].qty).toBe(2);
    expect(state.items[0].product.name).toBe('Milk');
  });

  it('should skip unavailable products', () => {
    const mockProducts: Product[] = [
      {
        id: 'prod-1',
        shop_id: 'shop-123',
        name: 'Milk',
        price: 10000,
        stock_qty: 100,
        image_url: null,
        category: 'dairy',
        is_available: true,
      },
    ];

    const reorderItems = [
      { product_id: 'prod-1', qty: 2 },
      { product_id: 'prod-2', qty: 1 }, // Not in products list
    ];

    const cartStore = useCartStore.getState();
    cartStore.reorderItems(mockProducts, reorderItems, 'shop-123');

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].product.id).toBe('prod-1');
  });

  it('should clear previous cart when reordering', () => {
    const mockProducts: Product[] = [
      {
        id: 'prod-1',
        shop_id: 'shop-123',
        name: 'Milk',
        price: 10000,
        stock_qty: 100,
        image_url: null,
        category: 'dairy',
        is_available: true,
      },
    ];

    const cartStore = useCartStore.getState();

    // Add item from different shop
    cartStore.addItem(
      { ...mockProducts[0], shop_id: 'shop-456' },
      'shop-456'
    );

    // Now reorder from different shop
    cartStore.reorderItems(mockProducts, [{ product_id: 'prod-1', qty: 1 }], 'shop-123');

    const state = useCartStore.getState();
    expect(state.shopId).toBe('shop-123');
    expect(state.items).toHaveLength(1);
  });
});

describe('Orders Store - Task 10.2', () => {
  beforeEach(() => {
    const ordersStore = useOrdersStore.getState();
    ordersStore.clearActive();
  });

  it('should set active order', () => {
    const mockOrder: Order = {
      id: 'order-123',
      shop_id: 'shop-123',
      shop_name: 'Fresh Kirana',
      status: 'pending',
      total_paise: 50000,
      items: [],
      payment_method: 'upi',
      created_at: '2026-04-16T10:30:00Z',
    };

    const store = useOrdersStore.getState();
    store.setActiveOrder(mockOrder);

    const state = useOrdersStore.getState();
    expect(state.activeOrder).toEqual(mockOrder);
  });

  it('should add order to history', () => {
    const mockOrder: Order = {
      id: 'order-123',
      shop_id: 'shop-123',
      shop_name: 'Fresh Kirana',
      status: 'pending',
      total_paise: 50000,
      items: [],
      payment_method: 'upi',
      created_at: '2026-04-16T10:30:00Z',
    };

    const store = useOrdersStore.getState();
    store.addToHistory(mockOrder);

    const state = useOrdersStore.getState();
    expect(state.history).toContain(mockOrder);
  });

  it('should clear active order', () => {
    const mockOrder: Order = {
      id: 'order-123',
      shop_id: 'shop-123',
      shop_name: 'Fresh Kirana',
      status: 'pending',
      total_paise: 50000,
      items: [],
      payment_method: 'upi',
      created_at: '2026-04-16T10:30:00Z',
    };

    const store = useOrdersStore.getState();
    store.setActiveOrder(mockOrder);
    store.clearActive();

    const state = useOrdersStore.getState();
    expect(state.activeOrder).toBeNull();
  });
});
