/** @type {import('tailwindcss').Config} */
const fs = require('fs');
const path = require('path');

/**
 * Load token objects from tokens.ts (CRA Node cannot require .ts directly).
 * Uses balanced-brace parsing for nested objects.
 */
function extractConstObject(src, name) {
  const marker = `export const ${name} = `;
  const start = src.indexOf(marker);
  if (start === -1) {
    throw new Error(`[tailwind] Could not find "${name}" in tokens.ts`);
  }
  const braceStart = src.indexOf('{', start + marker.length);
  if (braceStart === -1) {
    throw new Error(`[tailwind] Could not parse "${name}" from tokens.ts`);
  }
  let depth = 0;
  let i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return Function(`"use strict"; return (${src.slice(braceStart, i + 1)});`)();
}

function loadTokensFromTs() {
  const tokensPath = path.join(__dirname, 'src/theme/tokens.ts');
  const src = fs.readFileSync(tokensPath, 'utf8');

  return {
    colors: extractConstObject(src, 'colors'),
    semantic: extractConstObject(src, 'semantic'),
    fontFamily: extractConstObject(src, 'fontFamily'),
    typography: extractConstObject(src, 'typography'),
    borderRadius: extractConstObject(src, 'borderRadius'),
    boxShadow: extractConstObject(src, 'boxShadow'),
    spacing: extractConstObject(src, 'spacing'),
    motion: extractConstObject(src, 'motion'),
  };
}

function typographyToFontSize(typography) {
  return Object.fromEntries(
    Object.entries(typography).map(([key, value]) => [
      key,
      [
        value.fontSize,
        {
          lineHeight: value.lineHeight,
          ...(value.letterSpacing ? { letterSpacing: value.letterSpacing } : {}),
          ...(value.fontWeight ? { fontWeight: value.fontWeight } : {}),
        },
      ],
    ])
  );
}

const { colors, semantic, fontFamily, typography, borderRadius, boxShadow, spacing, motion } =
  loadTokensFromTs();

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        success: semantic.success,
        danger: semantic.danger,
        warning: semantic.warning,
        info: semantic.info,
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: colors['accent-blue'],
          700: colors['accent-blue-hover'],
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: colors['accent-blue'],
        },
        accent: {
          DEFAULT: colors['accent-blue'],
          hover: colors['accent-blue-hover'],
        },
      },
      fontFamily,
      fontSize: typographyToFontSize(typography),
      borderRadius: {
        input: borderRadius.input,
        button: borderRadius.button,
        card: borderRadius.card,
        modal: borderRadius.modal,
        pill: borderRadius.pill,
        thumbnail: borderRadius.thumbnail,
        xl: borderRadius.card,
        /** @deprecated use rounded-xl — kept for legacy pages */
        DEFAULT: borderRadius.card,
      },
      boxShadow: {
        sm: boxShadow.sm,
        card: boxShadow.card,
        'card-hover': boxShadow['card-hover'],
        md: boxShadow.md,
        modal: boxShadow.modal,
        xl: boxShadow.xl,
      },
      spacing: {
        page: spacing.page,
        section: spacing.section,
        card: spacing.card,
        stack: spacing.stack,
        inset: spacing.inset,
        11: '2.75rem',
      },
      height: {
        11: '2.75rem',
        12: '3rem',
      },
      minHeight: {
        11: '2.75rem',
        13: '3.25rem',
      },
      minWidth: {
        11: '2.75rem',
      },
      transitionDuration: {
        fast: motion.duration.fast,
        normal: motion.duration.normal,
        slow: motion.duration.slow,
      },
      transitionTimingFunction: {
        product: motion.easing.default,
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
