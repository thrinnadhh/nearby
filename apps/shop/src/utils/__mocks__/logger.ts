/**
 * Manual mock for logger — prevents console.log calls in tests
 */

export default {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
