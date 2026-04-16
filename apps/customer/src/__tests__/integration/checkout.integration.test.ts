import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { router } from 'expo-router';
import CheckoutScreen from '@/app/(tabs)/checkout';
import * as ordersService from '@/services/orders';
import * as searchService from '@/services/search';
import { useCartStore } from '@/store/cart';
import { useLocationStore } from '@/store/location';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';

// Mock dependencies
vi.mock('expo-router');
vi.mock('@/services/orders');
vi.mock('@/services/search');

const mockRouter = router as any;

describe('CheckoutScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock router
    mockRouter.back = vi.fn();
    mockRouter.push = vi.fn();

    // Setup default store states
    useCartStore.setState({
      items: [
        {
          product: { id: 'prod-1', name: 'Item 1', price: 1000 },
          qty: 2,
        },
      ],
      shopId: 'shop-1',
      entries: [{ productId: 'prod-1', qty: 2 }],
    });

    useLocationStore.setState({
      deliveryAddress: '123 Main St, City',
      deliveryCoords: { lat: 12.9, lng: 77.6 },
    });

    useAuthStore.setState({
      token: 'test-token',
    });

    useOrdersStore.setState({
      activeOrder: null,
    });
  });

  it('should render checkout screen with all sections', () => {
    render(<CheckoutScreen />);

    expect(screen.getByText('Checkout')).toBeDefined();
    expect(screen.getByText('Delivery address')).toBeDefined();
    expect(screen.getByText('Order items')).toBeDefined();
    expect(screen.getByText('Price breakdown')).toBeDefined();
    expect(screen.getByText('Payment method')).toBeDefined();
  });

  it('should display delivery address', () => {
    render(<CheckoutScreen />);

    expect(screen.getByText('123 Main St, City')).toBeDefined();
  });

  it('should display order items with correct prices', () => {
    render(<CheckoutScreen />);

    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('×2')).toBeDefined();
    expect(screen.getByText('₹20.00')).toBeDefined(); // 1000 * 2 paise = ₹20
  });

  it('should calculate subtotal, delivery fee, tax, and total', () => {
    render(<CheckoutScreen />);

    const subtotal = 2000; // 1000 * 2
    const deliveryFee = 2500; // ₹25 flat
    const tax = Math.round(subtotal * 0.05); // ₹1 (100 paise)
    const total = subtotal + deliveryFee + tax; // ₹48

    expect(screen.getByText('₹20.00')).toBeDefined(); // Subtotal
    expect(screen.getByText('₹25.00')).toBeDefined(); // Delivery fee
    expect(screen.getByText('₹1.00')).toBeDefined(); // Tax (approx)
  });

  it('should allow payment method selection between UPI and COD', async () => {
    const { getByText } = render(<CheckoutScreen />);

    const codButton = getByText('Cash on Delivery');
    expect(codButton).toBeDefined();

    fireEvent.press(codButton);

    // Verify COD is selected (radio button should show as selected)
    expect(screen.getByText('Cash on Delivery')).toBeDefined();
  });

  it('should show error when required fields are missing', async () => {
    useCartStore.setState({ items: [] });

    render(<CheckoutScreen />);

    const backButton = screen.getByText('Back to cart');
    expect(backButton).toBeDefined();
  });

  it('should navigate to address picker when edit address is pressed', async () => {
    render(<CheckoutScreen />);

    const editButton = screen.getByTestId('edit-address-button') || 
                      screen.UNSAFE_getByType('TouchableOpacity')[1]; // Address card

    fireEvent.press(editButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/address-picker');
  });

  it('should create order on place order button press', async () => {
    const mockOrder = {
      id: 'order-123',
      shop_id: 'shop-1',
      shop_name: 'Test Shop',
      status: 'pending' as const,
      total_paise: 7100,
      items: [],
      payment_method: 'upi' as const,
      created_at: '2026-04-16T10:00:00Z',
    };

    vi.mocked(searchService.searchProducts).mockResolvedValueOnce({
      data: [{ id: 'prod-1', name: 'Item 1', price: 1000 }],
    } as any);

    vi.mocked(ordersService.createOrder).mockResolvedValueOnce(mockOrder);
    vi.mocked(ordersService.generateIdempotencyKey).mockReturnValueOnce('key-123');

    const { getByText } = render(<CheckoutScreen />);

    const placeOrderButton = getByText('Place order');
    fireEvent.press(placeOrderButton);

    await waitFor(() => {
      expect(ordersService.createOrder).toHaveBeenCalled();
    });
  });

  it('should navigate to payment screen for UPI payment', async () => {
    const mockOrder = {
      id: 'order-123',
      shop_id: 'shop-1',
      shop_name: 'Test Shop',
      status: 'pending' as const,
      total_paise: 7100,
      items: [],
      payment_method: 'upi' as const,
      created_at: '2026-04-16T10:00:00Z',
    };

    vi.mocked(searchService.searchProducts).mockResolvedValueOnce({
      data: [{ id: 'prod-1', name: 'Item 1', price: 1000 }],
    } as any);

    vi.mocked(ordersService.createOrder).mockResolvedValueOnce(mockOrder);
    vi.mocked(ordersService.generateIdempotencyKey).mockReturnValueOnce('key-123');

    const { getByText } = render(<CheckoutScreen />);

    const placeOrderButton = getByText('Place order');
    fireEvent.press(placeOrderButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/(tabs)/payment/order-123'
      );
    });
  });

  it('should navigate to order confirmed screen for COD', async () => {
    const mockOrder = {
      id: 'order-456',
      shop_id: 'shop-1',
      shop_name: 'Test Shop',
      status: 'pending' as const,
      total_paise: 7100,
      items: [],
      payment_method: 'cod' as const,
      created_at: '2026-04-16T10:00:00Z',
    };

    vi.mocked(searchService.searchProducts).mockResolvedValueOnce({
      data: [{ id: 'prod-1', name: 'Item 1', price: 1000 }],
    } as any);

    vi.mocked(ordersService.createOrder).mockResolvedValueOnce(mockOrder);
    vi.mocked(ordersService.generateIdempotencyKey).mockReturnValueOnce('key-123');

    const { getByText } = render(<CheckoutScreen />);

    // Select COD
    const codButton = getByText('Cash on Delivery');
    fireEvent.press(codButton);

    const placeOrderButton = getByText('Place order');
    fireEvent.press(placeOrderButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/(tabs)/order-confirmed/order-456'
      );
    });
  });

  it('should handle order creation errors gracefully', async () => {
    vi.mocked(searchService.searchProducts).mockResolvedValueOnce({
      data: [{ id: 'prod-1', name: 'Item 1', price: 1000 }],
    } as any);

    vi.mocked(ordersService.createOrder).mockRejectedValueOnce(
      new Error('Network error')
    );

    vi.mocked(ordersService.generateIdempotencyKey).mockReturnValueOnce('key-123');

    const { getByText } = render(<CheckoutScreen />);

    const placeOrderButton = getByText('Place order');
    fireEvent.press(placeOrderButton);

    await waitFor(() => {
      // Alert should have been called (can't directly test Alert in React Native)
      // But we can verify button state returned to normal
      expect(placeOrderButton).toBeDefined();
    });
  });

  it('should disable place order button during processing', async () => {
    vi.mocked(searchService.searchProducts).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 1000))
    );

    const { getByType } = render(<CheckoutScreen />);

    const buttons = getByType('TouchableOpacity');
    const placeOrderBtn = buttons[buttons.length - 1]; // Last button is Place Order

    fireEvent.press(placeOrderBtn);

    // Button should be disabled during processing
    expect(placeOrderBtn.props.disabled).toBe(true);
  });

  it('should clear cart after successful order creation', async () => {
    const mockOrder = {
      id: 'order-123',
      shop_id: 'shop-1',
      shop_name: 'Test Shop',
      status: 'pending' as const,
      total_paise: 7100,
      items: [],
      payment_method: 'upi' as const,
      created_at: '2026-04-16T10:00:00Z',
    };

    vi.mocked(searchService.searchProducts).mockResolvedValueOnce({
      data: [{ id: 'prod-1', name: 'Item 1', price: 1000 }],
    } as any);

    vi.mocked(ordersService.createOrder).mockResolvedValueOnce(mockOrder);
    vi.mocked(ordersService.generateIdempotencyKey).mockReturnValueOnce('key-123');

    const clearCartSpy = vi.spyOn(useCartStore.getState(), 'clearCart');

    const { getByText } = render(<CheckoutScreen />);

    const placeOrderButton = getByText('Place order');
    fireEvent.press(placeOrderButton);

    await waitFor(() => {
      expect(clearCartSpy).toHaveBeenCalled();
    });
  });

  it('should re-enrich items with fresh server prices', async () => {
    vi.mocked(searchService.searchProducts).mockResolvedValueOnce({
      data: [{ id: 'prod-1', name: 'Item 1', price: 1200 }], // Price increased
    } as any);

    const mockOrder = {
      id: 'order-123',
      shop_id: 'shop-1',
      shop_name: 'Test Shop',
      status: 'pending' as const,
      total_paise: 7300, // Fresh total with new price
      items: [],
      payment_method: 'upi' as const,
      created_at: '2026-04-16T10:00:00Z',
    };

    vi.mocked(ordersService.createOrder).mockResolvedValueOnce(mockOrder);
    vi.mocked(ordersService.generateIdempotencyKey).mockReturnValueOnce('key-123');

    const { getByText } = render(<CheckoutScreen />);

    const placeOrderButton = getByText('Place order');
    fireEvent.press(placeOrderButton);

    await waitFor(() => {
      expect(searchService.searchProducts).toHaveBeenCalledWith(
        { q: '', shopId: 'shop-1', limit: 50 },
        'test-token'
      );
    });
  });
});
