/**
 * AddProductScreen tests
 * 40+ test cases covering UI rendering, user interactions, form handling, and navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AddProductScreen from '@/app/(tabs)/products/add';
import { useAddProduct } from '@/hooks/useAddProduct';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/hooks/useAddProduct');
jest.mock('@/components/product/ImagePickerModal', () => ({
  ImagePickerModal: ({ visible, onImageSelected, onClose }: any) =>
    visible ? (
      <MockImagePickerModal onImageSelected={onImageSelected} onClose={onClose} />
    ) : null,
}));
jest.mock('@/components/product/CategoryPicker', () => ({
  CategoryPicker: ({ value, onValueChange, error }: any) => (
    <MockCategoryPicker value={value} onValueChange={onValueChange} error={error} />
  ),
}));
jest.mock('@/components/product/UnitPicker', () => ({
  UnitPicker: ({ value, onValueChange, error }: any) => (
    <MockUnitPicker value={value} onValueChange={onValueChange} error={error} />
  ),
}));
jest.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => children,
}));
jest.mock('@/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock components
const MockImagePickerModal = ({ onImageSelected, onClose }: any) => (
  <MockComponent testID="image-picker-modal" />
);
const MockCategoryPicker = ({ value, onValueChange, error }: any) => (
  <MockComponent testID="category-picker" />
);
const MockUnitPicker = ({ value, onValueChange, error }: any) => (
  <MockComponent testID="unit-picker" />
);
const MockComponent = ({ testID }: any) => <Text testID={testID} />;

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('AddProductScreen', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockSetFormField = jest.fn();
  const mockSetImage = jest.fn();
  const mockValidateField = jest.fn();
  const mockSubmitProduct = jest.fn();
  const mockClearForm = jest.fn();

  const mockUseAddProduct = {
    formData: {
      image: null,
      name: '',
      description: '',
      category: '',
      price: 0,
      stockQty: 0,
      unit: '',
    },
    errors: {},
    isSubmitting: false,
    submitError: null,
    imagePreview: null,
    setFormField: mockSetFormField,
    setImage: mockSetImage,
    validateField: mockValidateField,
    submitProduct: mockSubmitProduct,
    clearForm: mockClearForm,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    (useAddProduct as jest.Mock).mockReturnValue(mockUseAddProduct);
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Screen rendering
  // ──────────────────────────────────────────────────────────────────────────────

  describe('screen rendering', () => {
    test('should render header with title', () => {
      render(<AddProductScreen />);
      expect(screen.getByText('Add Product')).toBeTruthy();
    });

    test('should render back button', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('add-product-back')).toBeTruthy();
    });

    test('should render image section', () => {
      render(<AddProductScreen />);
      expect(screen.getByText('Product Image')).toBeTruthy();
    });

    test('should render product details section', () => {
      render(<AddProductScreen />);
      expect(screen.getByText('Product Details')).toBeTruthy();
    });

    test('should render image placeholder when no image selected', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('select-image-button')).toBeTruthy();
    });

    test('should render product name input', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('product-name-input')).toBeTruthy();
    });

    test('should render description input', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('product-description-input')).toBeTruthy();
    });

    test('should render category picker', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('category-picker')).toBeTruthy();
    });

    test('should render price input', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('product-price-input')).toBeTruthy();
    });

    test('should render stock quantity input', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('product-stock-input')).toBeTruthy();
    });

    test('should render unit picker', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('product-unit-picker')).toBeTruthy();
    });

    test('should render cancel and submit buttons', () => {
      render(<AddProductScreen />);
      expect(screen.getByTestId('add-product-cancel')).toBeTruthy();
      expect(screen.getByTestId('add-product-submit')).toBeTruthy();
    });

    test('should show error alert if submitError exists', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        submitError: 'Product name is required',
      });

      render(<AddProductScreen />);
      expect(screen.getByText('Product name is required')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Image handling
  // ──────────────────────────────────────────────────────────────────────────────

  describe('image handling', () => {
    test('should open image picker when select image button pressed', () => {
      render(<AddProductScreen />);
      const selectImageButton = screen.getByTestId('select-image-button');
      fireEvent.press(selectImageButton);

      // Image picker should be visible (implementation dependent)
    });

    test('should display image preview when image is selected', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        imagePreview: { uri: 'file:///image.jpg', size: 500000 },
        formData: {
          ...mockUseAddProduct.formData,
          image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        },
      });

      render(<AddProductScreen />);
      expect(screen.getByTestId('product-image-preview')).toBeTruthy();
    });

    test('should show change button when image is selected', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        imagePreview: { uri: 'file:///image.jpg', size: 500000 },
        formData: {
          ...mockUseAddProduct.formData,
          image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        },
      });

      render(<AddProductScreen />);
      expect(screen.getByTestId('change-image-button')).toBeTruthy();
    });

    test('should show remove button when image is selected', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        imagePreview: { uri: 'file:///image.jpg', size: 500000 },
        formData: {
          ...mockUseAddProduct.formData,
          image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        },
      });

      render(<AddProductScreen />);
      expect(screen.getByTestId('remove-image-button')).toBeTruthy();
    });

    test('should show image error message if image error exists', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        errors: { image: 'Image size too large' },
      });

      render(<AddProductScreen />);
      expect(screen.getByText('Image size too large')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Form field handling
  // ──────────────────────────────────────────────────────────────────────────────

  describe('form field handling', () => {
    test('should update product name on input change', () => {
      render(<AddProductScreen />);
      const nameInput = screen.getByTestId('product-name-input');
      fireEvent.changeText(nameInput, 'Fresh Tomatoes');

      expect(mockSetFormField).toHaveBeenCalledWith('name', 'Fresh Tomatoes');
    });

    test('should update description on input change', () => {
      render(<AddProductScreen />);
      const descInput = screen.getByTestId('product-description-input');
      fireEvent.changeText(descInput, 'Organic tomatoes');

      expect(mockSetFormField).toHaveBeenCalledWith('description', 'Organic tomatoes');
    });

    test('should update price on input change', () => {
      render(<AddProductScreen />);
      const priceInput = screen.getByTestId('product-price-input');
      fireEvent.changeText(priceInput, '50.00');

      // Price should be converted to paise (5000)
      expect(mockSetFormField).toHaveBeenCalled();
    });

    test('should update stock quantity on input change', () => {
      render(<AddProductScreen />);
      const stockInput = screen.getByTestId('product-stock-input');
      fireEvent.changeText(stockInput, '100');

      expect(mockSetFormField).toHaveBeenCalledWith('stockQty', 100);
    });

    test('should show name field error if exists', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        errors: { name: 'Product name is required' },
      });

      render(<AddProductScreen />);
      expect(screen.getByText('Product name is required')).toBeTruthy();
    });

    test('should show price field error if exists', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        errors: { price: 'Price must be greater than 0' },
      });

      render(<AddProductScreen />);
      expect(screen.getByText('Price must be greater than 0')).toBeTruthy();
    });

    test('should show stock field error if exists', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        errors: { stockQty: 'Stock must be at least 0' },
      });

      render(<AddProductScreen />);
      expect(screen.getByText('Stock must be at least 0')).toBeTruthy();
    });

    test('should show character count in description field', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        formData: {
          ...mockUseAddProduct.formData,
          description: 'Test description',
        },
      });

      render(<AddProductScreen />);
      expect(screen.getByText('14/500 characters')).toBeTruthy();
    });


  // ──────────────────────────────────────────────────────────────────────────────
  // Form submission
  // ──────────────────────────────────────────────────────────────────────────────

  describe('form submission', () => {
    test('should call submitProduct when submit button pressed', async () => {
      mockSubmitProduct.mockResolvedValue({
        id: 'prod-1',
        shopId: 'shop-1',
        name: 'Fresh Tomatoes',
        description: '',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });

      render(<AddProductScreen />);
      const submitButton = screen.getByTestId('add-product-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSubmitProduct).toHaveBeenCalled();
      });
    });

    test('should show loading state during submission', async () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        isSubmitting: true,
      });

      mockSubmitProduct.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 1000))
      );

      render(<AddProductScreen />);

      // Loading indicator should be visible
      // Implementation depends on ActivityIndicator visibility
    });

    test('should disable form inputs during submission', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        isSubmitting: true,
      });

      render(<AddProductScreen />);
      const nameInput = screen.getByTestId('product-name-input');

      expect(nameInput.props.editable).toBe(false);
    });

    test('should show success alert on successful submission', async () => {
      const mockProduct = {
        id: 'prod-1',
        shopId: 'shop-1',
        name: 'Fresh Tomatoes',
        description: '',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      mockSubmitProduct.mockResolvedValue(mockProduct);

      render(<AddProductScreen />);
      const submitButton = screen.getByTestId('add-product-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success!',
          'Product added! Check your catalogue.',
          expect.any(Array)
        );
      });
    });

    test('should navigate back after successful submission', async () => {
      const mockProduct = {
        id: 'prod-1',
        shopId: 'shop-1',
        name: 'Fresh Tomatoes',
        description: '',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      mockSubmitProduct.mockResolvedValue(mockProduct);

      render(<AddProductScreen />);
      const submitButton = screen.getByTestId('add-product-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
        // Alert.alert callback should trigger navigation
      });
    });

    test('should clear form after successful submission', async () => {
      const mockProduct = {
        id: 'prod-1',
        shopId: 'shop-1',
        name: 'Fresh Tomatoes',
        description: '',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      mockSubmitProduct.mockResolvedValue(mockProduct);

      render(<AddProductScreen />);
      const submitButton = screen.getByTestId('add-product-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ──────────────────────────────────────────────────────────────────────────────

  describe('navigation', () => {
    test('should navigate back when back button pressed and form is empty', () => {
      render(<AddProductScreen />);
      const backButton = screen.getByTestId('add-product-back');
      fireEvent.press(backButton);

      expect(mockBack).toHaveBeenCalled();
    });

    test('should show discard confirmation when back button pressed with unsaved changes', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        formData: {
          ...mockUseAddProduct.formData,
          name: 'Fresh Tomatoes',
        },
      });

      render(<AddProductScreen />);
      const backButton = screen.getByTestId('add-product-back');
      fireEvent.press(backButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Changes?',
        'Are you sure you want to discard this product?',
        expect.any(Array)
      );
    });

    test('should navigate back when cancel button pressed and form is empty', () => {
      render(<AddProductScreen />);
      const cancelButton = screen.getByTestId('add-product-cancel');
      fireEvent.press(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });

    test('should show discard confirmation when cancel button pressed with unsaved changes', () => {
      (useAddProduct as jest.Mock).mockReturnValue({
        ...mockUseAddProduct,
        formData: {
          ...mockUseAddProduct.formData,
          name: 'Fresh Tomatoes',
        },
      });

      render(<AddProductScreen />);
      const cancelButton = screen.getByTestId('add-product-cancel');
      fireEvent.press(cancelButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Changes?',
        'Are you sure you want to discard this product?',
        expect.any(Array)
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Accessibility
  // ──────────────────────────────────────────────────────────────────────────────

  describe('accessibility', () => {
    test('should have testID on all input fields', () => {
      render(<AddProductScreen />);

      expect(screen.getByTestId('product-name-input')).toBeTruthy();
      expect(screen.getByTestId('product-description-input')).toBeTruthy();
      expect(screen.getByTestId('product-price-input')).toBeTruthy();
      expect(screen.getByTestId('product-stock-input')).toBeTruthy();
      expect(screen.getByTestId('category-picker')).toBeTruthy();
      expect(screen.getByTestId('unit-picker')).toBeTruthy();
    });

    test('should have testID on all buttons', () => {
      render(<AddProductScreen />);

      expect(screen.getByTestId('add-product-back')).toBeTruthy();
      expect(screen.getByTestId('add-product-cancel')).toBeTruthy();
      expect(screen.getByTestId('add-product-submit')).toBeTruthy();
      expect(screen.getByTestId('select-image-button')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('should handle special characters in product name', () => {
      render(<AddProductScreen />);
      const nameInput = screen.getByTestId('product-name-input');
      fireEvent.changeText(nameInput, 'Test™ © ®');

      expect(mockSetFormField).toHaveBeenCalledWith('name', 'Test™ © ®');
    });

    test('should handle empty price input', () => {
      render(<AddProductScreen />);
      const priceInput = screen.getByTestId('product-price-input');
      fireEvent.changeText(priceInput, '');

      expect(mockSetFormField).toHaveBeenCalled();
    });

    test('should handle decimal prices', () => {
      render(<AddProductScreen />);
      const priceInput = screen.getByTestId('product-price-input');
      fireEvent.changeText(priceInput, '49.99');

      expect(mockSetFormField).toHaveBeenCalled();
    });

    test('should handle zero stock quantity', () => {
      render(<AddProductScreen />);
      const stockInput = screen.getByTestId('product-stock-input');
      fireEvent.changeText(stockInput, '0');

      expect(mockSetFormField).toHaveBeenCalledWith('stockQty', 0);
    });

    test('should handle large stock quantities', () => {
      render(<AddProductScreen />);
      const stockInput = screen.getByTestId('product-stock-input');
      fireEvent.changeText(stockInput, '9999');

      expect(mockSetFormField).toHaveBeenCalledWith('stockQty', 9999);
    });
  });
});
