import React from 'react';
import './LoadingOrb.css';

export interface LoadingOrbProps {
  /** Size variant of the loading orb */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant using neon accent colors */
  color?: 'cyan' | 'magenta' | 'purple' | 'gradient';
  /** Optional additional CSS class */
  className?: string;
  /** Accessibility label for screen readers */
  'aria-label'?: string;
  /** Whether to show the outer glow effect */
  showGlow?: boolean;
  /** Animation speed variant */
  speed?: 'slow' | 'normal' | 'fast';
}

/**
 * LoadingOrb Component
 * 
 * A high-tech spinning gradient ring loader with glow effects.
 * Designed for the futuristic AI aesthetic, replacing basic spinners
 * with a visually stunning loading indicator.
 * 
 * Requirements: 3.5 - Loading states with animated gradient effects
 */
export const LoadingOrb: React.FC<LoadingOrbProps> = ({
  size = 'md',
  color = 'gradient',
  className = '',
  'aria-label': ariaLabel = 'Loading...',
  showGlow = true,
  speed = 'normal'
}) => {
  const classNames = [
    'loading-orb',
    `loading-orb--${size}`,
    `loading-orb--${color}`,
    `loading-orb--speed-${speed}`,
    showGlow ? 'loading-orb--glow' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      role="status"
      aria-label={ariaLabel}
    >
      <div className="loading-orb__ring loading-orb__ring--outer" />
      <div className="loading-orb__ring loading-orb__ring--inner" />
      <div className="loading-orb__core" />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

export default LoadingOrb;
