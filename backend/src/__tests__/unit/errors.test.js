import { AppError, INVALID_OTP, SHOP_NOT_FOUND, ORDER_NOT_FOUND } from '../../utils/errors.js';

describe('AppError', () => {
  it('should create an error with default statusCode 400', () => {
    const error = new AppError(INVALID_OTP, 'Invalid OTP code');

    expect(error.code).toBe(INVALID_OTP);
    expect(error.message).toBe('Invalid OTP code');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it('should create an error with custom statusCode', () => {
    const error = new AppError(SHOP_NOT_FOUND, 'Shop not found', 404);

    expect(error.code).toBe(SHOP_NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it('should support additional details', () => {
    const details = { field: 'phone', reason: 'invalid format' };
    const error = new AppError(INVALID_OTP, 'Validation failed', 400, details);

    expect(error.details).toEqual(details);
  });

  it('should be instanceof Error', () => {
    const error = new AppError(ORDER_NOT_FOUND, 'Order not found');
    expect(error instanceof Error).toBe(true);
  });

  it('should preserve stack trace', () => {
    const error = new AppError(SHOP_NOT_FOUND, 'Shop not found');
    expect(error.stack).toBeDefined();
    expect(error.stack.includes('errors.test.js')).toBe(true);
  });
});

describe('Error Codes', () => {
  it('should have all required error codes defined', () => {
    const errorCodes = [
      INVALID_OTP,
      SHOP_NOT_FOUND,
      ORDER_NOT_FOUND,
    ];

    errorCodes.forEach((code) => {
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });
  });

  it('should use SCREAMING_SNAKE_CASE format', () => {
    expect(INVALID_OTP).toMatch(/^[A-Z_]+$/);
    expect(SHOP_NOT_FOUND).toMatch(/^[A-Z_]+$/);
    expect(ORDER_NOT_FOUND).toMatch(/^[A-Z_]+$/);
  });
});
