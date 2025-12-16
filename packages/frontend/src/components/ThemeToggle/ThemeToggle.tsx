import React from 'react';
import './ThemeToggle.css';

interface ThemeToggleProps {
  currentTheme: 'day' | 'night';
  onToggle: () => void;
  position?: 'top-right' | 'header' | 'floating';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  currentTheme, 
  onToggle, 
  position = 'top-right' 
}) => {
  return (
    <button
      className={`theme-toggle theme-toggle--${position}`}
      onClick={onToggle}
      aria-label={`Switch to ${currentTheme === 'day' ? 'night' : 'day'} mode. Currently using ${currentTheme} mode.`}
      aria-pressed={currentTheme === 'night'}
      type="button"
      title={`Switch to ${currentTheme === 'day' ? 'night' : 'day'} mode`}
    >
      <div className={`theme-toggle__icon ${currentTheme === 'night' ? 'theme-toggle__icon--night' : 'theme-toggle__icon--day'}`}>
        {currentTheme === 'day' ? (
          <svg
            className="theme-toggle__sun"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            role="img"
            aria-label="Sun icon representing day mode"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg
            className="theme-toggle__moon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            role="img"
            aria-label="Moon icon representing night mode"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </div>
      <span className="sr-only">
        {currentTheme === 'day' ? 'Switch to dark theme' : 'Switch to light theme'}
      </span>
    </button>
  );
};