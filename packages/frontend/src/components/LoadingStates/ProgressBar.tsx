import React from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  className = '',
  'aria-label': ariaLabel
}) => {
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  const displayLabel = label || `${Math.round(normalizedProgress)}%`;

  return (
    <div className={`progress-bar progress-bar--${size} ${className}`}>
      {showLabel && (
        <div className="progress-bar__label">
          <span className="progress-bar__label-text">{displayLabel}</span>
        </div>
      )}
      <div
        className={`progress-bar__track progress-bar--${variant}`}
        role="progressbar"
        aria-valuenow={normalizedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || displayLabel}
      >
        <div
          className={`progress-bar__fill ${animated ? 'progress-bar__fill--animated' : ''}`}
          style={{ width: `${normalizedProgress}%` }}
        >
          <div className="progress-bar__shine"></div>
        </div>
      </div>
    </div>
  );
};