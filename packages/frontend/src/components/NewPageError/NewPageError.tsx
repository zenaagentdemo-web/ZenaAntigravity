/**
 * NewPageError Component
 * 
 * Error state component for the New page with glassmorphism styling,
 * error icon, message, and retry button with glow effect.
 * 
 * Requirements: 9.3
 * Validates: Property 26 - Error State Display
 */

import React from 'react';
import './NewPageError.css';

export interface NewPageErrorProps {
  /** Error message to display */
  message: string;
  /** Callback when retry button is clicked */
  onRetry: () => void;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * NewPageError - Error state for the New page
 * 
 * Displays a glassmorphism error card with:
 * - Error icon with red accent
 * - Error title and message
 * - Retry button with cyan glow effect
 */
export const NewPageError: React.FC<NewPageErrorProps> = ({
  message,
  onRetry,
  className = '',
  testId = 'new-page-error',
}) => {
  const baseClass = 'new-page-error';
  const combinedClassName = [baseClass, className].filter(Boolean).join(' ');

  return (
    <div 
      className={combinedClassName} 
      data-testid={testId}
      role="alert"
      aria-live="assertive"
    >
      <div className={`${baseClass}__card`} data-testid={`${testId}-card`}>
        {/* Error Icon */}
        <div className={`${baseClass}__icon-container`}>
          <svg 
            className={`${baseClass}__icon`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className={`${baseClass}__title`}>Unable to load threads</h2>

        {/* Error Message */}
        <p className={`${baseClass}__message`} data-testid={`${testId}-message`}>
          {message}
        </p>

        {/* Retry Button */}
        <button 
          className={`${baseClass}__retry-button`}
          onClick={onRetry}
          type="button"
          data-testid={`${testId}-retry`}
          aria-label="Retry loading threads"
        >
          <svg 
            className={`${baseClass}__retry-icon`}
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Try Again
        </button>
      </div>
    </div>
  );
};

export default NewPageError;
