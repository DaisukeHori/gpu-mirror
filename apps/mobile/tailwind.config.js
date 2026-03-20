const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'app/**/*.{ts,tsx}'),
    path.join(__dirname, 'components/**/*.{ts,tsx}'),
    path.join(__dirname, 'lib/**/*.{ts,tsx}'),
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--color-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        },
        border: { DEFAULT: 'rgb(var(--color-border) / <alpha-value>)' },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
          'on-accent': 'rgb(var(--color-text-on-accent) / <alpha-value>)',
        },
        accent: { DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)' },
        success: 'rgb(var(--color-success) / <alpha-value>)',
        destructive: 'rgb(var(--color-destructive) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
      },
      borderRadius: { card: '12px', pill: '99px', img: '8px' },
      borderWidth: { thin: '0.5px' },
    },
  },
  plugins: [],
};
