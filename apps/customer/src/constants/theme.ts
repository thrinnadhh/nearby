// ─── NearBy Saffron Market palette ──────────────────────────────────────────
// Warm terracotta + cream — local, trustworthy, community feel
export const colors = {
  // Brand
  primary: '#E35D23',        // Saffron terracotta
  primaryDeep: '#B9431B',    // Deep press state
  primarySoft: '#FBE4D3',    // Tinted backgrounds
  accent: '#F4A62A',         // Marigold yellow accent
  // Semantic
  success: '#2F8F5E',        // Turmeric green
  error: '#DC2626',
  warning: '#D97706',
  // Surfaces
  background: '#FBF4EA',     // Warm cream paper
  surface: '#FFFFFF',        // Card white
  card: '#FFFFFF',
  line: '#E9DDC7',           // Warm dividers
  // Text
  textPrimary: '#261A14',    // Deep warm ink
  textSecondary: '#6B5B4E',  // Muted warm brown
  textDisabled: '#B8A99A',
  white: '#FFFFFF',
  black: '#000000',
  // Aliases for backward compatibility
  text: '#261A14',
  textTertiary: '#B8A99A',
  textPrimarySecondary: '#6B5B4E',
  divider: '#E9DDC7',
  dark: '#261A14',
  border: '#E9DDC7',
  primaryLight: '#FBE4D3',  // alias for primarySoft
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  // Display (serif) — falls back to system serif if custom font not loaded
  display: 'Georgia',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontSize,
} as const;

export type Theme = typeof theme;
