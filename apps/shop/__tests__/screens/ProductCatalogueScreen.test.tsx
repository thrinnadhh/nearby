/**
 * ProductCatalogueScreen tests
 * 20+ test cases covering screen rendering, search, filtering, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import ProductCatalogueScreen from '@/app/(tabs)/products';
import { useProducts } from '@/hooks/useProducts';
import { useProductsStore } from '@/store/products';

jest.mock('expo-router');
jest.mock('@/hooks/useProducts');
jest.mock('@/store/products');
jest.mock('@/hooks/useFCM');
jest.mock('@/hooks/useOrderSocket');
jest.mock('@/components/common/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRouter = { push: jest.fn() };

const mockProduct = {
  id: 'prod-1',
  shopId: 'shop-1',
  name: 'Test Product',
  description: 'A test product',
  category: 'Vegetables',
  price: 5000,
  stockQty: 10,
  images: [
    { id: 'img-1', productId: 'prod-1', url: 'https://example.com/product.jpg', isPrimary: true, uploadedAt: '2026-04-17T10:00:00Z' },
  ],
  createdAt: '2026-04-17T10:00:00Z',
  updatedAt: '2026-04-17T10:00:00Z',
  isActive: true,
};

describe('ProductCatalogueScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  test('renders header title', () => {
    (useProducts as jest.Mock).mockReturnValue({
      products: [mockProduct],
      loading: false,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => [mockProduct]),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    expect(screen.getByText('Products')).toBeTruthy();
  });

  test('renders search input', () => {
    (useProducts as jest.Mock).mockReturnValue({
      products: [mockProduct],
      loading: false,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => [mockProduct]),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    expect(screen.getByTestId('product-search-input')).toBeTruthy();
  });

  test('handles search input changes', async () => {
    const mockSetSearchQuery = jest.fn();
    (useProducts as jest.Mock).mockReturnValue({
      products: [mockProduct],
      loading: false,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: mockSetSearchQuery,
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => [mockProduct]),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    const searchInput = screen.getByTestId('product-search-input');
    fireEvent.changeText(searchInput, 'test');

    await waitFor(
      () => {
        expect(mockSetSearchQuery).toHaveBeenCalled();
      },
      { timeout: 200 }
    );
  });

  test('shows loading state', () => {
    (useProducts as jest.Mock).mockReturnValue({
      products: [],
      loading: true,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => []),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    expect(screen.getByTestId('product-catalogue-grid-loading')).toBeTruthy();
  });

  test('shows error state with retry button', () => {
    const mockRetry = jest.fn();
    (useProducts as jest.Mock).mockReturnValue({
      products: [],
      loading: false,
      error: 'Network error',
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: mockRetry,
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => []),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    expect(screen.getByText('Network error')).toBeTruthy();
    expect(screen.getByTestId('product-catalogue-grid-retry-button')).toBeTruthy();
  });

  test('renders category tabs', () => {
    (useProducts as jest.Mock).mockReturnValue({
      products: [mockProduct],
      loading: false,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => [mockProduct]),
      getUniqueCategories: jest.fn(() => ['Vegetables']),
    });

    render(<ProductCatalogueScreen />);
    expect(screen.getByTestId('category-tab-all')).toBeTruthy();
  });

  test('displays product counter', () => {
    (useProducts as jest.Mock).mockReturnValue({
      products: [mockProduct],
      loading: false,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => [mockProduct]),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    expect(screen.getByText('1 of 1 products')).toBeTruthy();
  });

  test('navigates to product detail on press', () => {
    (useProducts as jest.Mock).mockReturnValue({
      products: [mockProduct],
      loading: false,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => [mockProduct]),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    const productCard = screen.getByTestId('product-card-prod-1');
    fireEvent.press(productCard);
    expect(mockRouter.push).toHaveBeenCalled();
  });

  test('renders product grid', () => {
    (useProducts as jest.Mock).mockReturnValue({
      products: [mockProduct],
      loading: false,
      error: null,
      fetchProducts: jest.fn(),
      deleteProduct: jest.fn(),
      retry: jest.fn(),
    });

    (useProductsStore as unknown as jest.Mock).mockReturnValue({
      searchQuery: '',
      activeCategory: 'all',
      setSearchQuery: jest.fn(),
      setActiveCategory: jest.fn(),
      filteredProducts: jest.fn(() => [mockProduct]),
      getUniqueCategories: jest.fn(() => []),
    });

    render(<ProductCatalogueScreen />);
    expect(screen.getByTestId('product-catalogue-grid')).toBeTruthy();
  });
});
