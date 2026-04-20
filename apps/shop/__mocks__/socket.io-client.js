/**
 * Manual mock for socket.io-client
 * Placed in __mocks__/ adjacent to node_modules so jest.mock('socket.io-client')
 * uses this file instead of auto-generating a broken mock.
 */

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  id: 'mock-socket-id',
  connected: true,
};

const io = jest.fn(() => mockSocket);

module.exports = io;
module.exports.default = io;
module.exports.io = io;
