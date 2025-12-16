import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'neutral';
  className?: string;
  'aria-label'?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  'aria-label': ariaLabel = 'Loading...'
}) => {
  return (
    <div
      className={`loading-spinner loading-spinner--${size} loading-spinner--${color} ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      <div className="loading-spinner__circle">
        <div className="loading-spinner__path"></div>
      </div>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};