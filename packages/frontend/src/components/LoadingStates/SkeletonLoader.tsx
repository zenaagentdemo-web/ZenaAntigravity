import React from 'react';
import './SkeletonLoader.css';

export interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number; // For text variant
  className?: string;
  animated?: boolean;
  'aria-label'?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animated = true,
  'aria-label': ariaLabel = 'Loading content...'
}) => {
  const getStyle = () => {
    const style: React.CSSProperties = {};
    
    if (width !== undefined) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }
    
    if (height !== undefined) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    }
    
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div 
        className={`skeleton-loader skeleton-loader--text-group ${className}`}
        role="status"
        aria-label={ariaLabel}
      >
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`skeleton-loader__item skeleton-loader--text ${animated ? 'skeleton-loader--animated' : ''}`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : '100%' // Last line is shorter
            }}
          />
        ))}
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={`skeleton-loader skeleton-loader--${variant} ${animated ? 'skeleton-loader--animated' : ''} ${className}`}
      style={getStyle()}
      role="status"
      aria-label={ariaLabel}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader {...props} variant="text" />
);

export const SkeletonCircle: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader {...props} variant="circular" />
);

export const SkeletonRectangle: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader {...props} variant="rectangular" />
);

export const SkeletonRounded: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader {...props} variant="rounded" />
);