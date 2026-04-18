/**
 * Tests for editProductValidation utility functions
 */

import {
  validateEditProductForm,
  validateEditProductField,
  rupeesToPaise,
  paiseToRupees,
  formatRupeesForDisplay,
  parsePriceInput,
  hasProductChanges,
  EditProductFormData,
} from '@/utils/editProductValidation';

describe('editProductValidation', () => {
  describe('rupeesToPaise', () => {
    it('should convert rupees to paise', () => {
      expect(rupeesToPaise(100)).toBe(10000);
      expect(rupeesToPaise(123.45)).toBe(12345);
      expect(rupeesToPaise(0.01)).toBe(1);
    });

    it('should handle string input', () => {
      expect(rupeesToPaise('100')).toBe(10000);
      expect(rupeesToPaise('123.45')).toBe(12345);
    });

    it('should handle edge cases', () => {
      expect(rupeesToPaise(0)).toBe(0);
      expect(rupeesToPaise(-50)).toBe(-5000);
    });

    it('should handle NaN input', () => {
      expect(rupeesToPaise(NaN)).toBe(0);
    });
  });

  describe('paiseToRupees', () => {
    it('should convert paise to rupees', () => {
      expect(paiseToRupees(10000)).toBe(100);
      expect(paiseToRupees(12345)).toBe(123.45);
      expect(paiseToRupees(1)).toBe(0.01);
    });

    it('should handle zero', () => {
      expect(paiseToRupees(0)).toBe(0);
    });
  });

  describe('formatRupeesForDisplay', () => {
    it('should format rupees for display', () => {
      expect(formatRupeesForDisplay(100)).toBe('100.00');
      expect(formatRupeesForDisplay(123.45)).toBe('123.45');
      expect(formatRupeesForDisplay(1000)).toBe('1,000.00');
    });

    it('should handle zero', () => {
      expect(formatRupeesForDisplay(0)).toBe('0.00');
    });
  });

  describe('parsePriceInput', () => {
    it('should parse price from various formats', () => {
      expect(parsePriceInput('₹100')).toBe(10000);
      expect(parsePriceInput('100')).toBe(10000);
      expect(parsePriceInput('123.45')).toBe(12345);
    });

    it('should handle whitespace', () => {
      expect(parsePriceInput('  ₹100  ')).toBe(10000);
      expect(parsePriceInput('  100  ')).toBe(10000);
    });

    it('should handle empty input', () => {
      expect(parsePriceInput('')).toBe(0);
    });
  });

  describe('validateEditProductForm', () => {
    it('should accept valid price', () => {
      const formData: EditProductFormData = {
        price: 10000, // ₹100
      };
      const errors = validateEditProductForm(formData);
      expect(errors.price).toBeUndefined();
    });

    it('should reject invalid price', () => {
      const formData: EditProductFormData = {
        price: 0, // Min is 1 paise
      };
      const errors = validateEditProductForm(formData);
      expect(errors.price).toBeDefined();
    });

    it('should accept valid stock', () => {
      const formData: EditProductFormData = {
        stockQty: 50,
      };
      const errors = validateEditProductForm(formData);
      expect(errors.stockQty).toBeUndefined();
    });

    it('should reject negative stock', () => {
      const formData: EditProductFormData = {
        stockQty: -1,
      };
      const errors = validateEditProductForm(formData);
      expect(errors.stockQty).toBeDefined();
    });

    it('should accept zero stock', () => {
      const formData: EditProductFormData = {
        stockQty: 0,
      };
      const errors = validateEditProductForm(formData);
      expect(errors.stockQty).toBeUndefined();
    });

    it('should require at least one field', () => {
      const formData: EditProductFormData = {};
      const errors = validateEditProductForm(formData);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should accept multiple fields', () => {
      const formData: EditProductFormData = {
        price: 10000,
        stockQty: 50,
      };
      const errors = validateEditProductForm(formData);
      expect(errors.price).toBeUndefined();
      expect(errors.stockQty).toBeUndefined();
    });

    it('should handle price boundary values', () => {
      // Min price: 1 paise
      let errors = validateEditProductForm({ price: 1 });
      expect(errors.price).toBeUndefined();

      // Max price: 999999900 paise (₹9,999,999)
      errors = validateEditProductForm({ price: 999999900 });
      expect(errors.price).toBeUndefined();

      // Above max
      errors = validateEditProductForm({ price: 999999901 });
      expect(errors.price).toBeDefined();
    });

    it('should reject non-integer price', () => {
      const formData: EditProductFormData = {
        price: 100.5, // Should be integer paise
      };
      const errors = validateEditProductForm(formData);
      expect(errors.price).toBeDefined();
    });
  });

  describe('validateEditProductField', () => {
    it('should validate price field individually', () => {
      const error = validateEditProductField('price', 10000);
      expect(error).toBeUndefined();
    });

    it('should show error for invalid price', () => {
      const error = validateEditProductField('price', 0);
      expect(error).toBeDefined();
    });

    it('should validate stock field individually', () => {
      const error = validateEditProductField('stockQty', 50);
      expect(error).toBeUndefined();
    });

    it('should show error for invalid stock', () => {
      const error = validateEditProductField('stockQty', -1);
      expect(error).toBeDefined();
    });

    it('should validate boolean isAvailable', () => {
      const error = validateEditProductField('isAvailable', true);
      expect(error).toBeUndefined();
    });
  });

  describe('hasProductChanges', () => {
    const original = {
      price: 10000,
      stockQty: 50,
      isAvailable: true,
    };

    it('should detect price change', () => {
      const edited: EditProductFormData = {
        price: 15000,
      };
      expect(hasProductChanges(original, edited)).toBe(true);
    });

    it('should detect stock change', () => {
      const edited: EditProductFormData = {
        stockQty: 30,
      };
      expect(hasProductChanges(original, edited)).toBe(true);
    });

    it('should detect availability change', () => {
      const edited: EditProductFormData = {
        isAvailable: false,
      };
      expect(hasProductChanges(original, edited)).toBe(true);
    });

    it('should detect multiple changes', () => {
      const edited: EditProductFormData = {
        price: 15000,
        stockQty: 30,
      };
      expect(hasProductChanges(original, edited)).toBe(true);
    });

    it('should not detect changes when values same', () => {
      const edited: EditProductFormData = {
        price: 10000,
      };
      expect(hasProductChanges(original, edited)).toBe(false);
    });

    it('should not detect changes when form empty', () => {
      const edited: EditProductFormData = {};
      expect(hasProductChanges(original, edited)).toBe(false);
    });

    it('should not detect changes when undefined', () => {
      const edited: EditProductFormData = {
        price: undefined,
        stockQty: undefined,
      };
      expect(hasProductChanges(original, edited)).toBe(false);
    });
  });
});
