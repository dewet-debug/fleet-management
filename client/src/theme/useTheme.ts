import { useEffect, useState, useCallback } from 'react';

/**
 * Theme + density controller for the Signal enhancement.
 * Toggles `.dark` / `.compact` on <html> (which flip the CSS variables in
 * tokens.css — no component-level dark: variants needed). Persists both to
 * localStorage and respects the OS dark preference on first load.
 */
type Theme = 'light' | 'dark';
type Density = 'comfortable' | 'compact';

const THEME_KEY = 'a49.theme';
const DENSITY_KEY = 'a49.density';

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) as Theme | null;
  if (saved) return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'light' : initialTheme(),
  );
  const [density, setDensityState] = useState<Density>(() =>
    typeof window === 'undefined' ? 'comfortable' : (localStorage.getItem(DENSITY_KEY) as Density) || 'comfortable',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('compact', density === 'compact');
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setDensity = useCallback((d: Density) => setDensityState(d), []);

  return { theme, setTheme, density, setDensity };
}
