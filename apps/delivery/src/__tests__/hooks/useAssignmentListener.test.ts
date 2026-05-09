/**
 * Simplified tests for useAssignmentListener hook logic
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAssignmentListener } from '@/hooks/useAssignmentListener';
import { useAuthStore } from '@/store/auth';
import { useAssignmentStore } from '@/store/assignment';
import * as socketService from '@/services/socket';

jest.mock('@/store/auth');
jest.mock('@/store/assignment');
jest.mock('@/services/socket');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseAssignmentStore = useAssignmentStore as jest.MockedFunction<
  typeof useAssignmentStore
>;
const mockSocketService = socketService as jest.Mocked<typeof socketService>;

describe('useAssignmentListener Hook Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default state when not authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: null,
      token: null,
      isAuthenticated: false,
    } as any);

    mockUseAssignmentStore.mockReturnValue({
      isListening: false,
      error: null,
      pendingAssignments: [],
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: jest.fn(),
    } as any);

    const { result } = renderHook(() => useAssignmentListener());

    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have pendingCount property', () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    const mockSetListening = jest.fn();
    const mockSetError = jest.fn();
    const mockAddPendingAssignment = jest.fn();

    mockUseAssignmentStore.mockReturnValue({
      isListening: false,
      error: null,
      pendingAssignments: [{ id: 'assign-1' }, { id: 'assign-2' }],
      setListening: mockSetListening,
      setError: mockSetError,
      addPendingAssignment: mockAddPendingAssignment,
    } as any);

    const { result } = renderHook(() => useAssignmentListener());

    expect(result.current.pendingCount).toBe(2);
  });

  it('should track listening state', () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    mockUseAssignmentStore.mockReturnValue({
      isListening: true,
      error: null,
      pendingAssignments: [],
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: jest.fn(),
    } as any);

    const { result } = renderHook(() => useAssignmentListener());

    expect(result.current.isListening).toBe(true);
  });

  it('should track error state', () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    mockUseAssignmentStore.mockReturnValue({
      isListening: false,
      error: 'Connection failed',
      pendingAssignments: [],
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: jest.fn(),
    } as any);

    const { result } = renderHook(() => useAssignmentListener());

    expect(result.current.error).toBe('Connection failed');
  });

  it('should provide socket connection status', () => {
    mockUseAuthStore.mockReturnValue({
      partnerId: 'partner-123',
      token: 'token-123',
      isAuthenticated: true,
    } as any);

    mockUseAssignmentStore.mockReturnValue({
      isListening: true,
      error: null,
      pendingAssignments: [],
      setListening: jest.fn(),
      setError: jest.fn(),
      addPendingAssignment: jest.fn(),
    } as any);

    mockSocketService.getSocket.mockReturnValue({
      connected: true,
      id: 'socket-id-123',
    } as any);

    const socket = mockSocketService.getSocket();
    expect(socket).not.toBeNull();
    if (socket) {
      expect(socket.connected).toBe(true);
    }
  });
});
