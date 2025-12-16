/**
 * AnimatedEmptyState Component
 * 
 * High-tech empty state with animated Zena orb and encouraging message.
 * Used when lists are empty to provide a friendly, engaging experience.
 * 
 * Requirements: 1.2 - AI Avatar with subtle breathing animations
 */

import React from 'react';
import { ZenaAvatar, ZenaAvatarState } from '../ZenaAvatar/ZenaAvatar';
import './AnimatedEmptyState.css';

export interface AnimatedEmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional secondary/encouraging message */
  subMessage?: string;
  /** Avatar state - defaults to idle for breathing animation */
  avatarState?: ZenaAvatarState;
  /** Avatar size - defaults to lg */
  avatarSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional action button text */
  actionText?: string;
  /** Optional action button handler */
  onAction?: () => void;
  /** Optional icon to show instead of Zena avatar */
  icon?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for testing */
  testId?: string;
  /** Show particle animations around the avatar */
  showParticles?: boolean;
}

/**
 * AnimatedEmptyState - Engaging empty state with Zena AI presence
 * 
 * Features:
 * - Animated Zena orb with breathing animation
 * - Glassmorphism container
 * - Encouraging message styling with glow effects
 * - Optional action button
 */
export const AnimatedEmptyState: React.FC<AnimatedEmptyStateProps> = ({
  message,
  subMessage,
  avatarState = 'idle',
  avatarSize = 'lg',
  actionText,
  onAction,
  icon,
  className = '',
  testId = 'animated-empty-state',
  showParticles = false,
}) => {
  const baseClass = 'animated-empty-state';
  const combinedClassName = [baseClass, className].filter(Boolean).join(' ');

  return (
    <div className={combinedClassName} data-testid={testId}>
      <div className={`${baseClass}__content`}>
        {/* Animated Zena Avatar or custom icon */}
        <div className={`${baseClass}__avatar-container`}>
          {icon ? (
            <div className={`${baseClass}__custom-icon`}>{icon}</div>
          ) : (
            <ZenaAvatar
              state={avatarState}
              size={avatarSize}
              showRings={true}
              ringCount={2}
              ariaLabel="Zena AI - Empty state"
              testId={`${testId}-avatar`}
            />
          )}
        </div>

        {/* Main message with glow effect */}
        <h3 className={`${baseClass}__message`}>{message}</h3>

        {/* Optional sub-message */}
        {subMessage && (
          <p className={`${baseClass}__sub-message`}>{subMessage}</p>
        )}

        {/* Optional action button */}
        {actionText && onAction && (
          <button
            className={`${baseClass}__action`}
            onClick={onAction}
            type="button"
          >
            {actionText}
          </button>
        )}
      </div>

      {/* Ambient background effect */}
      <div className={`${baseClass}__ambient`} aria-hidden="true" />

      {/* Particle animations */}
      {showParticles && (
        <div className={`${baseClass}__particles`} aria-hidden="true" data-testid={`${testId}-particles`}>
          <div className={`${baseClass}__particle`} />
          <div className={`${baseClass}__particle`} />
          <div className={`${baseClass}__particle`} />
          <div className={`${baseClass}__particle`} />
          <div className={`${baseClass}__particle`} />
          <div className={`${baseClass}__particle`} />
        </div>
      )}
    </div>
  );
};

export default AnimatedEmptyState;
