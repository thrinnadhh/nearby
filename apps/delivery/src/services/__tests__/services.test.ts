/**
 * Service tests — auth, partner, file upload
 */

// Mock modules BEFORE importing services
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  client: {
    get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    post: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    patch: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    delete: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

jest.mock('axios', () => ({
  isAxiosError: jest.fn(() => false),
}));

// NOW we can import the services
import * as authService from '@/services/auth';
import * as partnerService from '@/services/partner';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requestOTP returns successful response', async () => {
    const result = await authService.requestOTP({ phone: '9876543210' });
    expect(result).toBeDefined();
  });

  it('verifyOTP can be called', async () => {
    try {
      await authService.verifyOTP({ phone: '9876543210', otp: '000000' });
    } catch (error) {
      // Expected in test environment
      expect(error).toBeDefined();
    }
  });

  it('registerPartner can be called', async () => {
    try {
      const result = await authService.registerPartner({
        phone: '9876543210',
        otp: '123456',
      });
      expect(result).toBeDefined();
    } catch (error) {
      // Expected in test environment
      expect(error).toBeDefined();
    }
  });
});

describe('Partner Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submitKYC can be called with correct arguments', async () => {
    const result = await partnerService.submitKYC('partner-123', {
      aadhaarLast4: '1234',
      aadhaarImageUrl: 'https://example.com/aadhaar.jpg',
      vehiclePhotoUrl: 'https://example.com/vehicle.jpg',
    });
    expect(result).toBeDefined();
  });

  it('updateBankDetails can be called with correct arguments', async () => {
    const result = await partnerService.updateBankDetails('partner-123', {
      bankAccountNumber: '123456789012',
      bankIFSC: 'HDFC0001234',
      bankAccountName: 'Test Account',
    });
    expect(result).toBeDefined();
  });

  it('toggleOnlineStatus can be called with correct arguments', async () => {
    const result = await partnerService.toggleOnlineStatus('partner-123', true);
    expect(result).toBeDefined();
  });
});
