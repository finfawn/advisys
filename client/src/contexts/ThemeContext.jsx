import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', themeMode: 'system', setThemeMode: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }) {
  const mqlRef = useRef(null);
  const [themeMode, setThemeMode] = useState('system'); // 'system' | 'light' | 'dark'
  const [systemTheme, setSystemTheme] = useState('light');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('advisys_theme_mode');
      const savedTheme = localStorage.getItem('advisys_theme');
      if (savedMode) setThemeMode(savedMode);
      if (savedTheme) setTheme(savedTheme);
    } catch (_) {}

    if (window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mqlRef.current = mql;
      const apply = () => setSystemTheme(mql.matches ? 'dark' : 'light');
      apply();
      if (mql.addEventListener) mql.addEventListener('change', apply);
      else if (mql.addListener) mql.addListener(apply);
      return () => {
        if (mql.removeEventListener) mql.removeEventListener('change', apply);
        else if (mql.removeListener) mql.removeListener(apply);
      };
    } else {
      setSystemTheme('light');
    }
  }, []);

  useEffect(() => {
    const effective = themeMode === 'system' ? systemTheme : themeMode;
    try { localStorage.setItem('advisys_theme_mode', themeMode); } catch (_) {}
    try { localStorage.setItem('advisys_theme', effective); } catch (_) {}
    const root = document.documentElement;
    if (effective === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, [themeMode, systemTheme]);

  // Keep legacy setTheme in context for direct overrides
  useEffect(() => {
    if (theme === 'dark') setThemeMode('dark');
    else if (theme === 'light') setThemeMode('light');
  }, [theme]);

  const value = useMemo(() => ({ theme: themeMode === 'system' ? systemTheme : themeMode, themeMode, setThemeMode, setTheme }), [themeMode, systemTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }