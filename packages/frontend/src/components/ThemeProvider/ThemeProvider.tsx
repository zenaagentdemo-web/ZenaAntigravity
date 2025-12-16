import React, { useEffect } from 'react';
import { ThemeContext, useThemeLogic, Theme, EffectiveTheme } from '../../hooks/useTheme';
import './ThemeProvider.css';

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial theme to use (overrides stored preference) */
  initialTheme?: Theme;
  /** Whether to sync with system theme preference */
  syncWithSystem?: boolean;
  /** Callback when theme changes */
  onThemeChange?: (theme: Theme, effectiveTheme: EffectiveTheme) => void;
}

/**
 * ThemeProvider component that manages theme state and provides
 * theme context to all child components.
 * 
 * Features:
 * - Light and dark theme support
 * - Auto mode that follows system preference
 * - Smooth theme transitions
 * - Persistent theme preference storage
 * - Accessibility support (reduced motion, high contrast)
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children,
  initialTheme,
  syncWithSystem = true,
  onThemeChange
}) => {
  const themeLogic = useThemeLogic();

  // Handle initial theme override
  useEffect(() => {
    if (initialTheme && initialTheme !== themeLogic.theme) {
      themeLogic.setTheme(initialTheme);
    }
  }, [initialTheme]);

  // Notify parent of theme changes
  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(themeLogic.theme, themeLogic.effectiveTheme);
    }
  }, [themeLogic.theme, themeLogic.effectiveTheme, onThemeChange]);

  // Sync with system preference when enabled
  useEffect(() => {
    if (!syncWithSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if user has auto mode enabled
      if (themeLogic.theme === 'auto') {
        // The useThemeLogic hook already handles this, but we can
        // add additional logic here if needed
        console.log('System theme changed:', e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [syncWithSystem, themeLogic.theme]);

  return (
    <ThemeContext.Provider value={themeLogic}>
      <div className="theme-provider" data-effective-theme={themeLogic.effectiveTheme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};