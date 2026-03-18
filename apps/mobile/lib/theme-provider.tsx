import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storage } from './storage';
import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  getThemeStyles,
  getThemeVariableMap,
  type ThemeMode,
} from './theme';

type AppThemeContextValue = ReturnType<typeof getThemeStyles> & {
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

function syncDocumentTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;

  const variables = getThemeVariableMap(getThemeStyles(mode).colors);
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.setProperty('color-scheme', mode);

  for (const [name, value] of Object.entries(variables)) {
    document.documentElement.style.setProperty(name, value);
  }

  document.body.style.backgroundColor = `rgb(${variables['--color-bg']})`;
  document.body.style.color = `rgb(${variables['--color-text-primary']})`;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode | null>(null);

  useEffect(() => {
    let mounted = true;

    storage.getItem(THEME_STORAGE_KEY)
      .then((storedMode: string | null) => {
        if (!mounted) return;
        setModeState(isThemeMode(storedMode) ? storedMode : DEFAULT_THEME_MODE);
      })
      .catch(() => {
        if (mounted) setModeState(DEFAULT_THEME_MODE);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mode) return;
    syncDocumentTheme(mode);
  }, [mode]);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await storage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // Theme persistence is best-effort.
    }
  }, []);

  const value = useMemo(() => {
    if (!mode) return null;

    const theme = getThemeStyles(mode);

    return {
      ...theme,
      setMode,
      toggleMode: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [mode, setMode]);

  if (!value) return null;

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return value;
}
