import logger from '../../utils/logger.js';

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should have all required log levels', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log info messages without throwing', () => {
    expect(() => {
      logger.info('Test info message', { key: 'value' });
    }).not.toThrow();
  });

  it('should log warn messages without throwing', () => {
    expect(() => {
      logger.warn('Test warn message', { key: 'value' });
    }).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => {
      logger.error('Test error message', { key: 'value' });
    }).not.toThrow();
  });

  it('should log debug messages without throwing', () => {
    expect(() => {
      logger.debug('Test debug message', { key: 'value' });
    }).not.toThrow();
  });

  it('should handle objects as metadata', () => {
    expect(() => {
      logger.info('User action', {
        userId: 'abc123',
        action: 'login',
        timestamp: new Date().toISOString(),
      });
    }).not.toThrow();
  });

  it('should handle errors as metadata', () => {
    const err = new Error('Test error');
    expect(() => {
      logger.error('Something went wrong', { error: err.message });
    }).not.toThrow();
  });
});
