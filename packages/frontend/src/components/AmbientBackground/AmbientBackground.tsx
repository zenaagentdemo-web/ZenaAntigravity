/**
 * AmbientBackground Component
 * 
 * Creates subtle particle or gradient animations for the high-tech aesthetic.
 * Optimized for performance using CSS transforms and opacity only.
 * 
 * Requirements: 3.1, 8.4
 */

import React, { memo, useEffect, useState } from 'react';
import './AmbientBackground.css';

export type AmbientVariant = 'default' | 'subtle' | 'intense' | 'minimal';

export interface AmbientBackgroundProps {
  /** Visual intensity variant */
  variant?: AmbientVariant;
  /** Enable particle effects */
  showParticles?: boolean;
  /** Enable gradient orbs */
  showGradientOrbs?: boolean;
  /** Enable grid lines */
  showGrid?: boolean;
  /** Custom primary color (CSS variable or hex) */
  primaryColor?: string;
  /** Custom secondary color (CSS variable or hex) */
  secondaryColor?: string;
  /** Animation speed multiplier (1 = normal, 0.5 = slow, 2 = fast) */
  animationSpeed?: number;
  /** Disable all animations (for reduced motion) */
  disableAnimations?: boolean;
  /** Test ID for testing */
  testId?: string;
  /** Whether Zena is currently thinking (triggers breathing animation) */
  isThinking?: boolean;
}

/**
 * Generate particle positions for CSS-based particles
 * Uses deterministic positions for consistent rendering
 */
const generateParticleStyles = (count: number): React.CSSProperties[] => {
  const particles: React.CSSProperties[] = [];

  for (let i = 0; i < count; i++) {
    // Use deterministic pseudo-random positions based on index
    const x = ((i * 17) % 100);
    const y = ((i * 23) % 100);
    const size = 1 + (i % 3);
    const delay = (i * 0.5) % 10;
    const duration = 15 + (i % 20);

    particles.push({
      left: `${x}%`,
      top: `${y}%`,
      width: `${size}px`,
      height: `${size}px`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    });
  }

  return particles;
};

// Pre-generate particle styles for performance - 100 particles for rich ambient effect
const PARTICLE_STYLES = generateParticleStyles(100);

export const AmbientBackground: React.FC<AmbientBackgroundProps> = memo(({
  variant = 'default',
  showParticles = true,
  showGradientOrbs = true,
  showGrid = false,
  primaryColor,
  secondaryColor,
  animationSpeed = 1,
  disableAnimations = false,
  testId = 'ambient-background',
  isThinking = false,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const shouldAnimate = !disableAnimations && !prefersReducedMotion;

  // Build CSS custom properties for customization
  const customStyles: React.CSSProperties = {
    '--ambient-animation-speed': animationSpeed,
    ...(primaryColor && { '--ambient-primary': primaryColor }),
    ...(secondaryColor && { '--ambient-secondary': secondaryColor }),
  } as React.CSSProperties;

  return (
    <div
      className={`ambient-background ambient-background--${variant} ${isThinking ? 'ambient-background--thinking' : ''}`}
      data-testid={testId}
      data-animated={shouldAnimate}
      style={customStyles}
      aria-hidden="true"
    >
      {/* Gradient Orbs Layer */}
      {showGradientOrbs && (
        <div className="ambient-background__orbs">
          <div
            className={`ambient-orb ambient-orb--primary ${shouldAnimate ? 'ambient-orb--animated' : ''}`}
          />
          <div
            className={`ambient-orb ambient-orb--secondary ${shouldAnimate ? 'ambient-orb--animated' : ''}`}
          />
          <div
            className={`ambient-orb ambient-orb--tertiary ${shouldAnimate ? 'ambient-orb--animated' : ''}`}
          />
        </div>
      )}

      {/* Grid Lines Layer */}
      {showGrid && (
        <div className="ambient-background__grid" />
      )}

      {/* Particles Layer */}
      {showParticles && (
        <div className="ambient-background__particles">
          {PARTICLE_STYLES.map((style, index) => (
            <div
              key={index}
              className={`ambient-particle ambient-particle--${(index % 3) + 1} ${shouldAnimate ? 'ambient-particle--animated' : ''}`}
              style={style}
            />
          ))}
        </div>
      )}

      {/* Noise Texture Overlay */}
      <div className="ambient-background__noise" />

      {/* Vignette Effect */}
      <div className="ambient-background__vignette" />
    </div>
  );
});

AmbientBackground.displayName = 'AmbientBackground';

export default AmbientBackground;
