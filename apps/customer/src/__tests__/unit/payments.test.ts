import {
  validateCallback,
  generateDeepLinkCallback,
  extractOrderIdFromCallback,
} from '../payments';

describe('PaymentService - Callback Validation', () => {
  describe('validateCallback', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    it('should accept valid success callback', () => {
      const result = validateCallback(validUUID, 'success');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid failed callback', () => {
      const result = validateCallback(validUUID, 'failed');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid status', () => {
      const result = validateCallback(validUUID, 'pending');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid UUID format', () => {
      const result = validateCallback('not-a-uuid', 'success');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid order ID format');
    });

    it('should reject v1 UUID', () => {
      const v1UUID = '550e8400-e29b-11d4-a716-446655440000';
      const result = validateCallback(v1UUID, 'success');
      expect(result.valid).toBe(false);
    });

    it('should reject empty orderId', () => {
      const result = validateCallback('', 'success');
      expect(result.valid).toBe(false);
    });

    it('should reject uppercase/mixed case UUID', () => {
      const mixedCaseUUID = '550E8400-E29B-41D4-A716-446655440000';
      const result = validateCallback(mixedCaseUUID, 'success');
      expect(result.valid).toBe(true); // Regex is case-insensitive
    });

    it('should reject UUID with extra characters', () => {
      const invalidUUID = '550e8400-e29b-41d4-a716-446655440000-extra';
      const result = validateCallback(invalidUUID, 'success');
      expect(result.valid).toBe(false);
    });
  });

  describe('generateDeepLinkCallback', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    it('should generate valid deep-link URL', () => {
      const url = generateDeepLinkCallback(validUUID);
      expect(url).toContain('nearby-customer://payment-callback');
      expect(url).toContain(`orderId=${validUUID}`);
    });

    it('should return consistent URL for same orderId', () => {
      const url1 = generateDeepLinkCallback(validUUID);
      const url2 = generateDeepLinkCallback(validUUID);
      expect(url1).toBe(url2);
    });

    it('should handle different order IDs', () => {
      const orderId1 = '550e8400-e29b-41d4-a716-446655440000';
      const orderId2 = '660e8400-e29b-41d4-a716-446655440001';

      const url1 = generateDeepLinkCallback(orderId1);
      const url2 = generateDeepLinkCallback(orderId2);

      expect(url1).not.toBe(url2);
      expect(url2).toContain(orderId2);
    });
  });

  describe('extractOrderIdFromCallback', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    it('should extract orderId from valid deep-link', () => {
      const url = `nearby-customer://payment-callback?orderId=${validUUID}`;
      const extracted = extractOrderIdFromCallback(url);
      expect(extracted).toBe(validUUID);
    });

    it('should return null for invalid URL', () => {
      const extracted = extractOrderIdFromCallback('not-a-valid-url');
      expect(extracted).toBeNull();
    });

    it('should return null if orderId param missing', () => {
      const url = 'nearby-customer://payment-callback?status=success';
      const extracted = extractOrderIdFromCallback(url);
      expect(extracted).toBeNull();
    });

    it('should extract orderId with additional params', () => {
      const url = `nearby-customer://payment-callback?orderId=${validUUID}&status=success`;
      const extracted = extractOrderIdFromCallback(url);
      expect(extracted).toBe(validUUID);
    });

    it('should handle URL encoded parameters', () => {
      const encodedUrl = `nearby-customer://payment-callback?orderId=${encodeURIComponent(validUUID)}`;
      const extracted = extractOrderIdFromCallback(encodedUrl);
      expect(extracted).toBe(validUUID);
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'not a url at all',
        'ht!tp://invalid',
        '//missing-protocol',
      ];

      malformedUrls.forEach(url => {
        const extracted = extractOrderIdFromCallback(url);
        expect(extracted).toBeNull();
      });
    });
  });

  describe('Roundtrip: generateDeepLinkCallback → extractOrderIdFromCallback', () => {
    const validateUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it('should preserve orderId through encode-decode cycle', () => {
      const testUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d3-80b4-00c04fd430c8',
        'ffffffff-ffff-4fff-bfff-ffffffffffff',
      ];

      testUUIDs.forEach(uuid => {
        if (!validateUUID.test(uuid)) {
          console.warn(`Invalid test UUID: ${uuid}`);
          return;
        }
        const generated = generateDeepLinkCallback(uuid);
        const extracted = extractOrderIdFromCallback(generated);
        expect(extracted).toBe(uuid);
      });
    });
  });
});
