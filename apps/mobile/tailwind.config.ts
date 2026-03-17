import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0F0E0C', surface: '#1A1916', elevated: '#252320' },
        border: { DEFAULT: '#33302C' },
        text: {
          primary: '#F5F2EC',
          secondary: '#C5BFB6',
          muted: '#8A8580',
        },
        accent: { DEFAULT: '#C8956C' },
        success: '#7BAE7F',
        destructive: '#D4836D',
        warning: '#C8B06C',
      },
      borderRadius: { card: '12px', pill: '99px', img: '8px' },
      borderWidth: { thin: '0.5px' },
    },
  },
  plugins: [],
} satisfies Config;
