import { successResponse, errorResponse } from '../../utils/response.js';

describe('successResponse', () => {
  it('should return success response with data', () => {
    const data = { id: '123', name: 'Test' };
    const response = successResponse(data);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.error).toBeUndefined();
  });

  it('should include metadata if provided', () => {
    const data = { id: '123' };
    const meta = { page: 1, total: 100, limit: 10 };
    const response = successResponse(data, meta);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.meta).toEqual(meta);
  });

  it('should not include empty metadata', () => {
    const data = { id: '123' };
    const response = successResponse(data, {});

    expect(response.meta).toBeUndefined();
  });

  it('should handle null data', () => {
    const response = successResponse(null);

    expect(response.success).toBe(true);
    expect(response.data).toBeNull();
  });

  it('should handle array data', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const response = successResponse(data);

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(2);
  });
});

describe('errorResponse', () => {
  it('should return error response with code and message', () => {
    const response = errorResponse('ORDER_NOT_FOUND', 'Order does not exist');

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('ORDER_NOT_FOUND');
    expect(response.error.message).toBe('Order does not exist');
    expect(response.data).toBeUndefined();
  });

  it('should include error details if provided', () => {
    const details = { orderId: '123', reason: 'cancelled' };
    const response = errorResponse('ORDER_NOT_FOUND', 'Order not found', details);

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('ORDER_NOT_FOUND');
    expect(response.error.message).toBe('Order not found');
    expect(response.error.details).toEqual(details);
  });

  it('should not include empty details', () => {
    const response = errorResponse('VALIDATION_ERROR', 'Invalid input', {});

    expect(response.error.details).toBeUndefined();
  });

  it('should never have success true', () => {
    const response = errorResponse('ANY_ERROR', 'Any message');
    expect(response.success).toBe(false);
  });
});

describe('Response Structure', () => {
  it('success response should have required fields', () => {
    const response = successResponse({ test: true });

    expect(response.hasOwnProperty('success')).toBe(true);
    expect(response.hasOwnProperty('data')).toBe(true);
  });

  it('error response should have required fields', () => {
    const response = errorResponse('ERROR_CODE', 'Error message');

    expect(response.hasOwnProperty('success')).toBe(true);
    expect(response.hasOwnProperty('error')).toBe(true);
    expect(response.error.hasOwnProperty('code')).toBe(true);
    expect(response.error.hasOwnProperty('message')).toBe(true);
  });
});
