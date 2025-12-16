/**
 * High-Tech Shimmer Skeleton Components
 * 
 * Futuristic loading state components with gradient shimmer animation
 * using neon accent colors from the high-tech design system.
 * 
 * Requirements: 3.5
 * Validates: Property 14 - Loading State Shimmer
 */

import React from 'react';
import './ShimmerSkeleton.css';

export interface ShimmerSkeletonProps {
  /** Shape variant of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded' | 'card' | 'avatar' | 'metric';
  /** Width of the skeleton (number for px, string for any CSS value) */
  width?: string | number;
  /** Height of the skeleton (number for px, string for any CSS value) */
  height?: string | number;
  /** Number of text lines (only for text variant) */
  lines?: number;
  /** Additional CSS class names */
  className?: string;
  /** Whether to animate the shimmer effect */
  animated?: boolean;
  /** Neon accent color for the shimmer */
  accentColor?: 'cyan' | 'magenta' | 'purple' | 'green' | 'orange';
  /** Accessibility label */
  'aria-label'?: string;
}

export const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animated = true,
  accentColor = 'cyan',
  'aria-label': ariaLabel = 'Loading content...'
}) => {
  const getStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};
    
    if (width !== undefined) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }
    
    if (height !== undefined) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    }
    
    return style;
  };

  const baseClass = 'shimmer-skeleton';
  const variantClass = `${baseClass}--${variant}`;
  const animatedClass = animated ? `${baseClass}--animated` : '';
  const accentClass = `${baseClass}--${accentColor}`;

  // Multi-line text variant
  if (variant === 'text' && lines > 1) {
    return (
      <div 
        className={`${baseClass} ${baseClass}--text-group ${className}`}
        role="status"
        aria-label={ariaLabel}
        aria-busy="true"
      >
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`${baseClass}__line ${animatedClass} ${accentClass}`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  // Card variant with multiple skeleton elements
  if (variant === 'card') {
    return (
      <div 
        className={`${baseClass} ${variantClass} ${className}`}
        role="status"
        aria-label={ariaLabel}
        aria-busy="true"
        style={getStyle()}
      >
        <div className={`${baseClass}__card-header ${animatedClass} ${accentClass}`} />
        <div className={`${baseClass}__card-body`}>
          <div className={`${baseClass}__line ${animatedClass} ${accentClass}`} style={{ width: '100%' }} />
          <div className={`${baseClass}__line ${animatedClass} ${accentClass}`} style={{ width: '80%' }} />
          <div className={`${baseClass}__line ${animatedClass} ${accentClass}`} style={{ width: '60%' }} />
        </div>
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  // Metric variant for dashboard numbers
  if (variant === 'metric') {
    return (
      <div 
        className={`${baseClass} ${variantClass} ${className}`}
        role="status"
        aria-label={ariaLabel}
        aria-busy="true"
        style={getStyle()}
      >
        <div className={`${baseClass}__metric-value ${animatedClass} ${accentClass}`} />
        <div className={`${baseClass}__metric-label ${animatedClass} ${accentClass}`} />
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  // Avatar variant with glow effect
  if (variant === 'avatar') {
    return (
      <div 
        className={`${baseClass} ${variantClass} ${animatedClass} ${accentClass} ${className}`}
        role="status"
        aria-label={ariaLabel}
        aria-busy="true"
        style={getStyle()}
      >
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  // Default single element skeleton
  return (
    <div
      className={`${baseClass} ${variantClass} ${animatedClass} ${accentClass} ${className}`}
      style={getStyle()}
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

// Predefined shimmer skeleton components for common use cases
export const ShimmerText: React.FC<Omit<ShimmerSkeletonProps, 'variant'>> = (props) => (
  <ShimmerSkeleton {...props} variant="text" />
);

export const ShimmerCircle: React.FC<Omit<ShimmerSkeletonProps, 'variant'>> = (props) => (
  <ShimmerSkeleton {...props} variant="circular" />
);

export const ShimmerRectangle: React.FC<Omit<ShimmerSkeletonProps, 'variant'>> = (props) => (
  <ShimmerSkeleton {...props} variant="rectangular" />
);

export const ShimmerRounded: React.FC<Omit<ShimmerSkeletonProps, 'variant'>> = (props) => (
  <ShimmerSkeleton {...props} variant="rounded" />
);

export const ShimmerCard: React.FC<Omit<ShimmerSkeletonProps, 'variant'>> = (props) => (
  <ShimmerSkeleton {...props} variant="card" />
);

export const ShimmerAvatar: React.FC<Omit<ShimmerSkeletonProps, 'variant'>> = (props) => (
  <ShimmerSkeleton {...props} variant="avatar" />
);

export const ShimmerMetric: React.FC<Omit<ShimmerSkeletonProps, 'variant'>> = (props) => (
  <ShimmerSkeleton {...props} variant="metric" />
);

export default ShimmerSkeleton;
