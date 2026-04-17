/**
 * Product validation tests
 * 10+ test cases covering validation schema and field validation
 */

import {
  validateProductForm,
  validateProductField,
  validateImageFile,
  parsePriceToPaise,
  formatPrice,
  toApiPayload,
  IMAGE_CONSTRAINTS,
  ProductFormData,
} from '@/utils/productValidation';

describe('productValidation', () => {
  // ──────────────────────────────────────────────────────────────────────────────
  // validateProductForm
  // ──────────────────────────────────────────────────────────────────────────────

  describe('validateProductForm', () => {
    test('should return no errors for valid form', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Organic tomatoes from local farm',
        category: 'vegetable',
        price: 5000, // ₹50
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(Object.keys(errors).length).toBe(0);
    });

    test('should require image', () => {
      const formData: ProductFormData = {
        image: null,
        name: 'Fresh Tomatoes',
        description: 'Organic tomatoes',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.image).toBeTruthy();
    });

    test('should require product name', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: '',
        description: 'Test description',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.name).toBeTruthy();
    });

    test('should enforce minimum name length (2 characters)', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'A',
        description: 'Test',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.name).toContain('at least 2 characters');
    });

    test('should enforce maximum name length (100 characters)', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'A'.repeat(101),
        description: 'Test',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.name).toContain('not exceed 100 characters');
    });

    test('should allow optional description', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: '',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.description).toBeUndefined();
    });

    test('should enforce maximum description length (500 characters)', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'A'.repeat(501),
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.description).toContain('not exceed 500 characters');
    });

    test('should require category', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: '',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.category).toBeTruthy();
    });

    test('should require valid category', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: 'invalid_category',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.category).toBeTruthy();
    });

    test('should require price', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: 'vegetable',
        price: 0,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.price).toBeTruthy();
    });

    test('should require positive price', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: 'vegetable',
        price: -1000,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.price).toBeTruthy();
    });

    test('should require integer price', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: 'vegetable',
        price: 5000.5,
        stockQty: 100,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.price).toBeTruthy();
    });

    test('should require stock quantity', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: 'vegetable',
        price: 5000,
        stockQty: -1,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.stockQty).toBeTruthy();
    });

    test('should allow zero stock quantity', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: 'vegetable',
        price: 5000,
        stockQty: 0,
        unit: 'kg',
      };

      const errors = validateProductForm(formData);
      expect(errors.stockQty).toBeUndefined();
    });

    test('should require unit', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Test',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: '',
      };

      const errors = validateProductForm(formData);
      expect(errors.unit).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // validateProductField
  // ──────────────────────────────────────────────────────────────────────────────

  describe('validateProductField', () => {
    test('should return null for valid field', () => {
      const error = validateProductField('name', 'Fresh Tomatoes');
      expect(error).toBeNull();
    });

    test('should return error for invalid field', () => {
      const error = validateProductField('name', '');
      expect(error).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // validateImageFile
  // ──────────────────────────────────────────────────────────────────────────────

  describe('validateImageFile', () => {
    test('should accept valid JPEG image', () => {
      const result = validateImageFile({
        uri: 'file:///image.jpg',
        name: 'image.jpg',
        type: 'image/jpeg',
        size: 1000000,
      });

      expect(result.valid).toBe(true);
    });

    test('should accept valid PNG image', () => {
      const result = validateImageFile({
        uri: 'file:///image.png',
        name: 'image.png',
        type: 'image/png',
        size: 1000000,
      });

      expect(result.valid).toBe(true);
    });

    test('should reject non-image MIME type', () => {
      const result = validateImageFile({
        uri: 'file:///file.pdf',
        name: 'file.pdf',
        type: 'application/pdf',
        size: 1000000,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should reject oversized image', () => {
      const result = validateImageFile({
        uri: 'file:///large.jpg',
        name: 'large.jpg',
        type: 'image/jpeg',
        size: IMAGE_CONSTRAINTS.MAX_SIZE + 1,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // parsePriceToPaise
  // ──────────────────────────────────────────────────────────────────────────────

  describe('parsePriceToPaise', () => {
    test('should convert rupees to paise', () => {
      expect(parsePriceToPaise(50)).toBe(5000);
      expect(parsePriceToPaise(100.5)).toBe(10050);
      expect(parsePriceToPaise('25.50')).toBe(2550);
    });

    test('should return 0 for invalid input', () => {
      expect(parsePriceToPaise('invalid')).toBe(0);
      expect(parsePriceToPaise('')).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // formatPrice
  // ──────────────────────────────────────────────────────────────────────────────

  describe('formatPrice', () => {
    test('should format paise to rupees', () => {
      expect(formatPrice(5000)).toBe('₹50.00');
      expect(formatPrice(10050)).toBe('₹100.50');
      expect(formatPrice(100)).toBe('₹1.00');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // toApiPayload
  // ──────────────────────────────────────────────────────────────────────────────

  describe('toApiPayload', () => {
    test('should convert form data to API payload', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: 'Fresh Tomatoes',
        description: 'Organic tomatoes',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const payload = toApiPayload(formData);

      expect(payload.name).toBe('Fresh Tomatoes');
      expect(payload.description).toBe('Organic tomatoes');
      expect(payload.category).toBe('vegetable');
      expect(payload.price).toBe(5000);
      expect(payload.stock_quantity).toBe(100);
      expect(payload.unit).toBe('kg');
      expect(payload.image).toBeUndefined(); // Image sent as file
    });

    test('should trim whitespace from text fields', () => {
      const formData: ProductFormData = {
        image: { uri: 'file:///image.jpg', name: 'image.jpg', type: 'image/jpeg' },
        name: '  Fresh Tomatoes  ',
        description: '  Organic  ',
        category: 'vegetable',
        price: 5000,
        stockQty: 100,
        unit: 'kg',
      };

      const payload = toApiPayload(formData);

      expect(payload.name).toBe('Fresh Tomatoes');
      expect(payload.description).toBe('Organic');
    });
  });
});
