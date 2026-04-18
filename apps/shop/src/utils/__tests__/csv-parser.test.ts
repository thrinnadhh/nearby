/**
 * CSV Parser Utility Tests
 */

import {
  parseCsvFile,
  normalizeHeaders,
  transformRow,
  validateFile,
  convertPriceToPaise,
  convertStockQty,
} from '@/utils/csv-parser';
import { PickedFile, CsvRawRow } from '@/types/csv';

describe('csv-parser utility', () => {
  describe('validateFile', () => {
    it('should accept valid CSV file', () => {
      const file: PickedFile = {
        uri: 'file://test.csv',
        name: 'test.csv',
        size: 1024,
        type: 'text/csv',
      };

      expect(validateFile(file)).toBe(true);
    });

    it('should reject file with invalid extension', () => {
      const file: PickedFile = {
        uri: 'file://test.xlsx',
        name: 'test.xlsx',
        size: 1024,
        type: 'application/vnd.ms-excel',
      };

      expect(() => validateFile(file)).toThrow('CSV file');
    });

    it('should reject file exceeding size limit', () => {
      const file: PickedFile = {
        uri: 'file://test.csv',
        name: 'test.csv',
        size: 10 * 1024 * 1024, // 10MB, exceeds 5MB limit
        type: 'text/csv',
      };

      expect(() => validateFile(file)).toThrow('File size');
    });
  });

  describe('normalizeHeaders', () => {
    it('should map user headers to canonical names', () => {
      const userHeaders = [
        'product name',
        'description',
        'category',
        'price',
        'stock qty',
        'unit',
      ];

      const result = normalizeHeaders(userHeaders);

      expect(result).toHaveProperty('Product Name');
      expect(result).toHaveProperty('Description');
    });

    it('should throw error for missing required headers', () => {
      const userHeaders = ['product name', 'category'];

      expect(() => normalizeHeaders(userHeaders)).toThrow('Missing required columns');
    });

    it('should handle case-insensitive header matching', () => {
      const userHeaders = [
        'PRODUCT NAME',
        'Description',
        'Category',
        'PRICE (₹)',
        'Stock Quantity',
        'UNIT',
      ];

      expect(() => normalizeHeaders(userHeaders)).not.toThrow();
    });
  });

  describe('transformRow', () => {
    it('should transform raw row with user headers to canonical headers', () => {
      const headerMap = {
        'Product Name': 'product name',
        'Category': 'category',
        'Price (₹)': 'price',
        'Stock Quantity': 'stock qty',
        'Unit': 'unit',
      };

      const rawRow: CsvRawRow = {
        'product name': 'Basmati Rice',
        'category': 'grocery',
        'price': '250',
        'stock qty': '50',
        'unit': 'kg',
      };

      const result = transformRow(rawRow, headerMap);

      expect(result['Product Name']).toBe('Basmati Rice');
      expect(result['Category']).toBe('grocery');
    });

    it('should trim whitespace from values', () => {
      const headerMap = {
        'Product Name': 'product name',
      };

      const rawRow: CsvRawRow = {
        'product name': '  Basmati Rice  ',
      };

      const result = transformRow(rawRow, headerMap);

      expect(result['Product Name']).toBe('Basmati Rice');
    });
  });

  describe('convertPriceToPaise', () => {
    it('should convert rupees to paise', () => {
      expect(convertPriceToPaise('250')).toBe(25000);
      expect(convertPriceToPaise('250.50')).toBe(25050);
    });

    it('should handle decimal places correctly', () => {
      expect(convertPriceToPaise('1.50')).toBe(150);
      expect(convertPriceToPaise('0.50')).toBe(50);
    });

    it('should throw error for invalid price', () => {
      expect(() => convertPriceToPaise('invalid')).toThrow();
    });
  });

  describe('convertStockQty', () => {
    it('should convert string to integer', () => {
      expect(convertStockQty('50')).toBe(50);
      expect(convertStockQty('100')).toBe(100);
    });

    it('should handle whitespace', () => {
      expect(convertStockQty('  50  ')).toBe(50);
    });

    it('should throw error for invalid quantity', () => {
      expect(() => convertStockQty('invalid')).toThrow();
    });
  });
});
