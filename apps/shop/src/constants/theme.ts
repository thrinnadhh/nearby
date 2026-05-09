/**
 * Shared design tokens for NearBy Shop Owner app
 * NearBy Saffron Market palette
 */

export const colors = {
  // Primary — Saffron terracotta
  primary: '#E35D23',
  primaryLight: '#FBE4D3',
  primaryDark: '#B9431B',
  primarySoft: '#FBE4D3',
  primaryDeep: '#B9431B',
  accent: '#F4A62A',

  // Semantic
  success: '#2F8F5E',
  successLight: '#D1F0E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  // Neutral — warm cream paper palette
  white: '#FFFFFF',
  black: '#000000',
  background: '#FBF4EA',
  backgroundSecondary: '#F5ECD8',
  surface: '#FFFFFF',
  surfaceSecondary: '#FBE4D3',
  card: '#FFFFFF',
  border: '#E9DDC7',
  borderLight: '#F0E8D8',
  line: '#E9DDC7',

  // Text — warm ink
  textPrimary: '#261A14',
  textSecondary: '#6B5B4E',
  textTertiary: '#B8A99A',
  textDisabled: '#B8A99A',
  textInverse: '#FFFFFF',

  // Status badges
  trusted: '#2F8F5E',
  good: '#2563EB',
  new: '#D97706',
  review: '#DC2626',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
};

export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  /** @deprecated Use semiBold */
  semibold: 'Inter-SemiBold',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  display: 'Georgia',
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#261A14',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#261A14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#261A14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};
