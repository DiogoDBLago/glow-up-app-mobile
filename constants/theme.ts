export const Colors = {
  light: {
    primary: '#FF4F93',
    primaryDeep: '#DB2777',
    background: '#FFFFFF',
    card: '#FFFFFF',
    foreground: '#2A1B2E',
    ink: '#2A1B2E',
    inkSoft: '#8B7280',
    mutedForeground: '#666666',
    border: '#EAEAEA',
    input: '#EAEAEA',
    destructive: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
  dark: {
    primary: '#EC4899',
    primaryDeep: '#DB2777',
    primaryGlow: '#F472B6',
    background: '#0F0B12',
    card: '#1A121F',
    cardDeep: '#221628',
    foreground: '#FFFFFF',
    ink: '#FFFFFF',
    inkSoft: 'rgba(255,255,255,0.72)',
    mutedForeground: 'rgba(255,255,255,0.72)',
    border: 'rgba(255,255,255,0.08)',
    input: 'rgba(255,255,255,0.12)',
  },
};

export const Gradients = {
  luxe: ['#DB2777', '#FF4F93', '#FF4F93'] as const,
  ink: ['#111111', '#2A1B2E', '#FF4F93'] as const,
  darkLuxe: ['#1A121F', '#221628', '#EC4899'] as const,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  full: 9999,
};

export const Shadows = {
  petal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  glow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  luxe: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
};
