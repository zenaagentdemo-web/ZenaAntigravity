/**
 * ZenaAvatar Component
 * 
 * High-tech AI avatar with gradient background and animated glow effects.
 * Represents the Zena AI assistant with various states for different interactions.
 * 
 * Now uses ParticleAvatar for a holographic particle effect.
 */

import React from 'react';
import { HolographicAvatar, AvatarAnimationState } from '../HolographicAvatar/HolographicAvatar';
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
  /** Audio amplitude for particle reactivity (0-1) */
  amplitude?: number;
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
  /** Custom image for the avatar */
  imageSrc?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Map ZenaAvatarState to AvatarAnimationState
 */
const mapState = (state: ZenaAvatarState): AvatarAnimationState => {
  switch (state) {
    case 'processing':
      return 'thinking';
    case 'listening':
      return 'listening';
    case 'speaking':
      return 'speaking';
    case 'active':
    case 'success':
    case 'error':
    case 'idle':
    default:
      return 'idle';
  }
};

/**
 * Determine size in pixels
 */
const getPixelSize = (size: ZenaAvatarSize): number => {
  switch (size) {
    case 'xs': return 32;
    case 'sm': return 48;
    case 'md': return 80;
    case 'lg': return 120;
    case 'xl': return 180;
    case 'full': return 300;
    default: return 80;
  }
};

/**
 * ZenaAvatar - The visual representation of Zena AI
 */
export const ZenaAvatar: React.FC<ZenaAvatarProps> = ({
  state = 'idle',
  size = 'md',
  amplitude = 0,
  showRings = true,
  ringCount = 3,
  className = '',
  onClick,
  ariaLabel = 'Zena AI Assistant',
  imageSrc,
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

  const pixelSize = getPixelSize(size);
  const animationState = mapState(state);

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

  return (
    <div
      className={combinedClassName}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      data-state={state}
      data-size={size}
    >
      {rings}
      <div className={`${baseClass}__inner`}>
        <HolographicAvatar
          animationState={animationState}
          size={pixelSize}
          amplitude={amplitude}
          imageSrc={imageSrc}
        />
      </div>
    </div>
  );
};

export default ZenaAvatar;
