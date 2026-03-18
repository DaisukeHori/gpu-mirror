export interface DesignTheme {
  background: string;
  surface: string;
  elevated: string;
  border: string;
  muted: string;
  secondary: string;
  primary: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  onAccent: string;
  success: string;
  destructive: string;
  warning: string;
}

export const DARK_THEME: DesignTheme = {
  background: '#0F0E0C',
  surface: '#1A1916',
  elevated: '#252320',
  border: '#33302C',
  muted: '#8A8580',
  secondary: '#C5BFB6',
  primary: '#F5F2EC',
  accent: '#C8956C',
  accentDark: '#A87750',
  accentLight: '#E8C4A0',
  onAccent: '#0F0E0C',
  success: '#7BAE7F',
  destructive: '#D4836D',
  warning: '#C8B06C',
};

export const LIGHT_THEME: DesignTheme = {
  background: '#FAF8F5',
  surface: '#F0EDE7',
  elevated: '#FFFFFF',
  border: '#D8D1C6',
  muted: '#8C847B',
  secondary: '#6B6560',
  primary: '#1A1916',
  accent: '#C8956C',
  accentDark: '#A87750',
  accentLight: '#E8C4A0',
  onAccent: '#1A1916',
  success: '#6F9B73',
  destructive: '#C77562',
  warning: '#B7944E',
};

export const RADIUS = {
  card: 12,
  pill: 99,
  img: 8,
} as const;

export const ANIMATION = {
  durationMs: 250,
  easing: 'ease-out',
} as const;

export const BORDER_WIDTH = 0.5;
