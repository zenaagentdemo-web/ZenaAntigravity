import { useState, useEffect, createContext, useContext } from 'react';

export type Theme = 'day' | 'night' | 'high-tech' | 'auto';
export type EffectiveTheme = 'day' | 'night' | 'high-tech';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isHighTech: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeLogic = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('zena-theme');
    // Default to high-tech theme for the new AI aesthetic
    return (stored as Theme) || 'high-tech';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('high-tech');

  // Determine effective theme based on user preference and system preference
  useEffect(() => {
    const updateEffectiveTheme = () => {
      if (theme === 'auto') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setEffectiveTheme(systemPrefersDark ? 'night' : 'day');
      } else if (theme === 'high-tech') {
        setEffectiveTheme('high-tech');
      } else {
        setEffectiveTheme(theme);
      }
    };

    updateEffectiveTheme();

    // Listen for system theme changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateEffectiveTheme);
      return () => mediaQuery.removeEventListener('change', updateEffectiveTheme);
    }
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme attributes
    root.removeAttribute('data-theme');
    
    // Apply new theme
    if (effectiveTheme === 'night') {
      root.setAttribute('data-theme', 'night');
    } else if (effectiveTheme === 'high-tech') {
      root.setAttribute('data-theme', 'high-tech');
    }
    
    // Add transition class for smooth theme changes
    root.classList.add('theme-transitioning');
    
    // Remove transition class after animation completes
    const timer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
    
    return () => clearTimeout(timer);
  }, [effectiveTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('zena-theme', newTheme);
  };

  const toggleTheme = () => {
    // Cycle through themes: high-tech -> day -> night -> high-tech
    const themeOrder: EffectiveTheme[] = ['high-tech', 'day', 'night'];
    const currentIndex = themeOrder.indexOf(effectiveTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    isHighTech: effectiveTheme === 'high-tech',
  };
};