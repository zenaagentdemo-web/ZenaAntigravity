/**
 * ZenaAvatar Component
 * 
 * High-tech AI avatar with gradient background and animated glow effects.
 * Represents the Zena AI assistant with various states for different interactions.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import React from 'react';
import './ZenaAvatar.css';

export type ZenaAvatarState = 
  | 'idle'
  | 'active'
  | 'processing'
  | 'listening'
  | 'speaking'
  | 'success'
  | 'error';

export type ZenaAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ZenaAvatarProps {
  /** Current state of the avatar affecting animations */
  state?: ZenaAvatarState;
  /** Size variant of the avatar */
  size?: ZenaAvatarSize;
  /** Whether to show pulse ring animations */
  showRings?: boolean;
  /** Number of pulse rings to display (1-3) */
  ringCount?: 1 | 2 | 3;
  /** Custom icon to display inside the avatar */
  icon?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Accessible label for the avatar */
  ariaLabel?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * ZenaAvatar - The visual representation of Zena AI
 * 
 * Features:
 * - Gradient background with cyan (#00D4FF), magenta (#FF00FF), purple (#8B5CF6)
 * - Box-shadow glow effects
 * - State-based animation variations
 * - Pulse ring animations
 * - Multiple size variants
 */
export const ZenaAvatar: React.FC<ZenaAvatarProps> = ({
  state = 'idle',
  size = 'md',
  showRings = true,
  ringCount = 3,
  icon,
  className = '',
  onClick,
  ariaLabel = 'Zena AI Assistant',
  testId = 'zena-avatar',
}) => {
  const baseClass = 'zena-avatar';
  const stateClass = `${baseClass}--${state}`;
  const sizeClass = `${baseClass}--${size}`;
  
  const combinedClassName = [
    baseClass,
    stateClass,
    sizeClass,
    className,
  ].filter(Boolean).join(' ');

  // Determine if rings should be visible based on state
  const shouldShowRings = showRings && ['idle', 'active', 'listening', 'processing'].includes(state);

  // Generate ring elements
  const rings = shouldShowRings
    ? Array.from({ length: ringCount }, (_, i) => (
        <span
          key={`ring-${i + 1}`}
          className={`${baseClass}__ring ${baseClass}__ring--${i + 1}`}
          aria-hidden="true"
        />
      ))
    : null;

  // Default icon (simple AI symbol)
  const defaultIcon = (
    <svg
      className={`${baseClass}__icon`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={combinedClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      data-state={state}
      data-size={size}
    >
      {rings}
      <div className={`${baseClass}__inner`}>
        {icon || defaultIcon}
      </div>
    </div>
  );
};

export default ZenaAvatar;
