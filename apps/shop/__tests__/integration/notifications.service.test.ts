/**
 * Integration tests for notifications service
 */

// Extend the global expo-notifications mock with getPermissionsAsync
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'test-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

import * as Notifications from 'expo-notifications';
import {
  configureForegroundNotifications,
  getFCMToken,
  requestNotificationPermissions,
  onNotificationResponse,
} from '@/services/notifications';

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockSetHandler = Notifications.setNotificationHandler as jest.Mock;
const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('configureForegroundNotifications', () => {
  it('calls setNotificationHandler', () => {
    configureForegroundNotifications();
    expect(mockSetHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) })
    );
  });

  it('handleNotification returns shouldShowAlert:true', async () => {
    configureForegroundNotifications();
    const handler = mockSetHandler.mock.calls[0][0];
    const result = await handler.handleNotification({
      request: { content: { title: 'New Order' } },
    });
    expect(result.shouldShowAlert).toBe(true);
    expect(result.shouldPlaySound).toBe(true);
  });
});

describe('getFCMToken', () => {
  it('returns token when permissions granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: true });
    mockGetToken.mockResolvedValueOnce({ data: 'fcm-token-abc-xyz-12345' });

    const token = await getFCMToken();
    expect(token).toBe('fcm-token-abc-xyz-12345');
  });

  it('returns null when permissions not granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });

    const token = await getFCMToken();
    expect(token).toBeNull();
  });

  it('returns null on error', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Permissions error')
    );

    const token = await getFCMToken();
    expect(token).toBeNull();
  });
});

describe('requestNotificationPermissions', () => {
  it('returns true when granted', async () => {
    mockRequestPermissions.mockResolvedValueOnce({ granted: true });
    const result = await requestNotificationPermissions();
    expect(result).toBe(true);
  });

  it('returns false when denied', async () => {
    mockRequestPermissions.mockResolvedValueOnce({ granted: false });
    const result = await requestNotificationPermissions();
    expect(result).toBe(false);
  });

  it('returns false on error', async () => {
    mockRequestPermissions.mockRejectedValueOnce(new Error('Permission denied'));
    const result = await requestNotificationPermissions();
    expect(result).toBe(false);
  });
});

describe('onNotificationResponse', () => {
  it('registers listener and returns cleanup function', () => {
    const mockRemove = jest.fn();
    mockAddListener.mockReturnValueOnce({ remove: mockRemove });

    const callback = jest.fn();
    const cleanup = onNotificationResponse(callback);

    expect(mockAddListener).toHaveBeenCalledWith(expect.any(Function));
    expect(typeof cleanup).toBe('function');

    cleanup();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('calls callback when notification response received', () => {
    const mockRemove = jest.fn();
    const mockNotification = { request: { content: { title: 'New Order' } } };
    mockAddListener.mockImplementationOnce((cb: Function) => {
      cb({ notification: mockNotification });
      return { remove: mockRemove };
    });

    const callback = jest.fn();
    onNotificationResponse(callback);

    expect(callback).toHaveBeenCalledWith(mockNotification);
  });
});
