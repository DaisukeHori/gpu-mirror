import { vars } from 'nativewind';
import {
  ANIMATION,
  BORDER_WIDTH,
  DARK_THEME,
  LIGHT_THEME,
  RADIUS,
  type DesignTheme,
} from '@revol-mirror/shared';
import { Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'revol.theme.mode';
export const DEFAULT_THEME_MODE: ThemeMode = Platform.OS === 'web' ? 'light' : 'dark';

export const THEMES = {
  dark: DARK_THEME,
  light: LIGHT_THEME,
} satisfies Record<ThemeMode, DesignTheme>;

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace('#', '');
  const chunkSize = normalized.length === 3 ? 1 : 2;
  const parts = normalized.match(new RegExp(`.{1,${chunkSize}}`, 'g')) ?? [];

  return parts
    .map((part) => (chunkSize === 1 ? parseInt(`${part}${part}`, 16) : parseInt(part, 16)))
    .join(' ');
}

export function getThemeVariableMap(theme: DesignTheme) {
  return {
    '--color-bg': hexToRgbChannels(theme.background),
    '--color-bg-surface': hexToRgbChannels(theme.surface),
    '--color-bg-elevated': hexToRgbChannels(theme.elevated),
    '--color-border': hexToRgbChannels(theme.border),
    '--color-text-primary': hexToRgbChannels(theme.primary),
    '--color-text-secondary': hexToRgbChannels(theme.secondary),
    '--color-text-muted': hexToRgbChannels(theme.muted),
    '--color-text-on-accent': hexToRgbChannels(theme.onAccent),
    '--color-accent': hexToRgbChannels(theme.accent),
    '--color-success': hexToRgbChannels(theme.success),
    '--color-destructive': hexToRgbChannels(theme.destructive),
    '--color-warning': hexToRgbChannels(theme.warning),
  } as const;
}

export function getThemeStyles(mode: ThemeMode) {
  const colors = THEMES[mode];

  return {
    mode,
    isDark: mode === 'dark',
    colors,
    radius: RADIUS,
    animation: ANIMATION,
    borderWidth: BORDER_WIDTH,
    variables: vars(getThemeVariableMap(colors)),
  };
}
