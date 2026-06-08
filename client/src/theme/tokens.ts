/**
 * Design tokens — single source of truth for CRM brand styles (V2).
 * Consumed by Tailwind (via tailwind.config.js), components, and PDF generator.
 */

export const colors = {
  'brand-yellow': '#FBBF24',
  'brand-yellow-hover': '#EAB308',
  'brand-yellow-dark': '#D97706',
  'brand-black': '#111111',
  'brand-white': '#FFFFFF',
  'accent-blue': '#2563eb',
  'accent-blue-hover': '#1d4ed8',
  /** Surface system V2 */
  'surface-page': '#FAFAFA',
  'surface-base': '#FFFFFF',
  'surface-elevated': '#FFFFFF',
  'surface-raised': '#FFFFFF',
  'surface-muted': '#F9FAFB',
  'surface-inset': '#F4F4F5',
  'surface-accent': '#FFFBEB',
  'surface-overlay': '#FFFFFF',
  'surface-sidebar': '#0A0A0A',
  'text-muted': '#6B7280',
  'text-secondary': '#6B7280',
  border: '#E5E7EB',
  'border-input': '#D1D5DB',
  'border-subtle': '#E8E8EC',
  zebra: '#FAFAFA',
} as const;

/** Semantic status colors (Tailwind-compatible palette steps) */
export const semantic = {
  success: {
    DEFAULT: '#16a34a',
    light: '#ecfdf5',
    dark: '#15803d',
  },
  danger: {
    DEFAULT: '#dc2626',
    light: '#fef2f2',
    dark: '#b91c1c',
  },
  warning: {
    DEFAULT: '#D97706',
    light: '#fffbeb',
    dark: '#b45309',
  },
  info: {
    DEFAULT: '#2563eb',
    light: '#eff6ff',
    dark: '#1d4ed8',
  },
} as const;

export const fontFamily = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ],
} as const;

/**
 * Typography scale V2 — size + line-height pairs.
 * Legacy h1–h3 aliases kept for backward compatibility.
 */
export const typography = {
  display: {
    fontSize: '2.25rem',
    lineHeight: '2.75rem',
    fontWeight: '700',
    letterSpacing: '-0.025em',
  },
  'page-title': {
    fontSize: '1.75rem',
    lineHeight: '2.125rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  h1: {
    fontSize: '1.75rem',
    lineHeight: '2.125rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  'section-title': {
    fontSize: '1.125rem',
    lineHeight: '1.75rem',
    fontWeight: '600',
    letterSpacing: '-0.015em',
  },
  h2: {
    fontSize: '1.125rem',
    lineHeight: '1.75rem',
    fontWeight: '600',
    letterSpacing: '-0.015em',
  },
  'card-title': {
    fontSize: '0.9375rem',
    lineHeight: '1.375rem',
    fontWeight: '600',
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '0.9375rem',
    lineHeight: '1.375rem',
    fontWeight: '600',
    letterSpacing: '-0.01em',
  },
  body: {
    fontSize: '0.875rem',
    lineHeight: '1.375rem',
    fontWeight: '400',
  },
  'body-medium': {
    fontSize: '0.875rem',
    lineHeight: '1.375rem',
    fontWeight: '500',
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: '1.125rem',
    fontWeight: '500',
  },
  label: {
    fontSize: '0.6875rem',
    lineHeight: '1rem',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  overline: {
    fontSize: '0.6875rem',
    lineHeight: '1rem',
    fontWeight: '600',
    letterSpacing: '0.08em',
  },
  metric: {
    fontSize: '1.5rem',
    lineHeight: '2rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  price: {
    fontSize: '0.9375rem',
    lineHeight: '1.375rem',
    fontWeight: '600',
    letterSpacing: '-0.01em',
  },
} as const;

export const borderRadius = {
  input: '0.5rem',
  button: '0.5rem',
  card: '0.75rem',
  modal: '1rem',
  pill: '9999px',
  thumbnail: '0.625rem',
} as const;

export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
  'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  modal: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.06)',
} as const;

/** Motion tokens V2 */
export const motion = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '300ms',
  },
  easing: {
    default: 'cubic-bezier(0.16, 1, 0.3, 1)',
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

/** Spacing aliases — 24/32px section rhythm */
export const spacing = {
  page: '1.5rem',
  section: '2rem',
  card: '1.25rem',
  stack: '0.75rem',
  inset: '1rem',
} as const;

/** PDF / inline-style alias map (backward-compatible with pdfGenerator BRAND) */
export const BRAND = {
  yellow: colors['brand-yellow'],
  yellowDark: colors['brand-yellow-dark'],
  black: colors['brand-black'],
  white: colors['brand-white'],
  textMuted: colors['text-muted'],
  border: colors.border,
  zebra: colors.zebra,
} as const;

export type ColorToken = keyof typeof colors;
export type SemanticColor = keyof typeof semantic;
export type TypographyToken = keyof typeof typography;
