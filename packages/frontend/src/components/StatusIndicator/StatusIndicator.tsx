/**
 * StatusIndicator Component
 * 
 * Animated pulsing dot indicators with color-coded status.
 * Part of the High-Tech AI Aesthetic design system.
 * 
 * Requirements: 5.5
 */

import React from 'react';
import './StatusIndicator.css';

export type StatusType = 'success' | 'warning' | 'error' | 'info';

export interface StatusIndicatorProps {
  /** The status type determining color and animation */
  status: StatusType;
  /** Optional label text to display next to the indicator */
  label?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the pulsing animation */
  animated?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Get the appropriate aria-label based on status
 */
const getDefaultAriaLabel = (status: StatusType, label?: string): string => {
  const statusLabels: Record<StatusType, string> = {
    success: 'Status: Success',
    warning: 'Status: Warning',
    error: 'Status: Error - Requires attention',
    info: 'Status: Information',
  };
  
  return label ? `${statusLabels[status]} - ${label}` : statusLabels[status];
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'medium',
  animated = true,
  className = '',
  ariaLabel,
}) => {
  const containerClasses = [
    'status-indicator-ht',
    `status-indicator-ht--${size}`,
    className,
  ].filter(Boolean).join(' ');

  const dotClasses = [
    'status-dot-ht',
    `status-dot-ht--${status}`,
    !animated && 'status-dot-ht--static',
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      role="status"
      aria-label={ariaLabel || getDefaultAriaLabel(status, label)}
    >
      <span className={dotClasses} aria-hidden="true" />
      {label && (
        <span className="status-label-ht">{label}</span>
      )}
    </div>
  );
};

/**
 * Standalone status dot without container
 */
export interface StatusDotProps {
  status: StatusType;
  animated?: boolean;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  animated = true,
  className = '',
}) => {
  const dotClasses = [
    'status-dot-ht',
    `status-dot-ht--${status}`,
    !animated && 'status-dot-ht--static',
    className,
  ].filter(Boolean).join(' ');

  return <span className={dotClasses} aria-hidden="true" />;
};

export default StatusIndicator;
