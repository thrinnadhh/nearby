/**
 * Screen component tests — HomeScreen and OnlineToggleScreen
 * Simplified tests that avoid importing modules with vector-icons
 */

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: { name: 'mock-icon' },
  FontAwesome: { name: 'mock-icon' },
  Ionicons: { name: 'mock-icon' },
}));

jest.mock('@/store/partner');
jest.mock('@/store/auth');
jest.mock('@/hooks/useOnlineStatus');
jest.mock('@/services/api');

describe('Delivery Partner Screens - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HomeScreen', () => {
    it('can be imported without errors', () => {
      // Just verify the module can be imported
      expect(() => {
        require('../HomeScreen');
      }).not.toThrow();
    });
  });

  describe('OnlineToggleScreen', () => {
    it('can be imported without errors', () => {
      // Just verify the module can be imported
      expect(() => {
        require('../OnlineToggleScreen');
      }).not.toThrow();
    });
  });

  describe('AadhaarScreen', () => {
    it('can be imported without errors', () => {
      // Just verify the module can be imported
      expect(() => {
        require('../AadhaarScreen');
      }).not.toThrow();
    });
  });

  describe('VehiclePhotoScreen', () => {
    it('can be imported without errors', () => {
      // Just verify the module can be imported
      expect(() => {
        require('../VehiclePhotoScreen');
      }).not.toThrow();
    });
  });

  describe('BankDetailsScreen', () => {
    it('can be imported without errors', () => {
      // Just verify the module can be imported
      expect(() => {
        require('../BankDetailsScreen');
      }).not.toThrow();
    });
  });

  describe('ProfileScreen', () => {
    it('can be imported without errors', () => {
      // Just verify the module can be imported
      expect(() => {
        require('../ProfileScreen');
      }).not.toThrow();
    });
  });
});
