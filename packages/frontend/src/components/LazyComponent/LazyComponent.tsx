/**
 * LazyComponent - Wrapper for lazy loading non-critical components
 * 
 * Provides:
 * - Intersection Observer-based lazy loading
 * - Loading skeleton fallback
 * - Error boundary for failed loads
 * - Accessibility announcements
 */

import React, { Suspense, useState, useEffect, useRef, ComponentType } from 'react';
import { useLazyLoading } from '../../hooks/useLazyLoading';
import { announce } from '../../utils/accessibility';
import './LazyComponent.css';

export interface LazyComponentProps<T extends object> {
  /** The lazy-loaded component */
  component: React.LazyExoticComponent<ComponentType<T>>;
  /** Props to pass to the component */
  componentProps?: T;
  /** Custom loading fallback */
  fallback?: React.ReactNode;
  /** Threshold for intersection observer (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Whether to load immediately without waiting for visibility */
  immediate?: boolean;
  /** Accessible name for the component being loaded */
  accessibleName?: string;
  /** Minimum height for the placeholder */
  minHeight?: number | string;
  /** Custom className */
  className?: string;
  /** Callback when component loads */
  onLoad?: () => void;
  /** Callback when component fails to load */
  onError?: (error: Error) => void;
}

interface LazyComponentState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Default loading skeleton for lazy components
 */
const DefaultSkeleton: React.FC<{ minHeight?: number | string }> = ({ minHeight = 100 }) => (
  <div 
    className="lazy-component__skeleton"
    style={{ minHeight }}
    role="progressbar"
    aria-label="Loading content"
    aria-busy="true"
  >
    <div className="lazy-component__skeleton-shimmer" />
  </div>
);

/**
 * Error fallback for failed component loads
 */
const ErrorFallback: React.FC<{ 
  error: Error; 
  onRetry?: () => void;
  accessibleName?: string;
}> = ({ error, onRetry, accessibleName }) => (
  <div 
    className="lazy-component__error"
    role="alert"
    aria-live="assertive"
  >
    <p className="lazy-component__error-message">
      Failed to load {accessibleName || 'component'}
    </p>
    {onRetry && (
      <button 
        className="lazy-component__retry-button"
        onClick={onRetry}
        aria-label={`Retry loading ${accessibleName || 'component'}`}
      >
        Retry
      </button>
    )}
  </div>
);

/**
 * LazyComponent wrapper for lazy loading non-critical components
 */
export function LazyComponent<T extends object>({
  component: Component,
  componentProps,
  fallback,
  threshold = 0.1,
  rootMargin = '100px',
  immediate = false,
  accessibleName,
  minHeight = 100,
  className = '',
  onLoad,
  onError,
}: LazyComponentProps<T>): React.ReactElement {
  const [state, setState] = useState<LazyComponentState>({
    hasError: false,
    error: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const { isVisible, ref, forceLoad } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  const shouldRender = immediate || isVisible;

  // Handle successful load
  useEffect(() => {
    if (shouldRender && !state.hasError && !isLoaded) {
      // Small delay to ensure component is actually rendered
      const timer = setTimeout(() => {
        setIsLoaded(true);
        if (accessibleName) {
          announce(`${accessibleName} loaded`, 'polite');
        }
        onLoad?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldRender, state.hasError, isLoaded, accessibleName, onLoad]);

  // Handle retry
  const handleRetry = () => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      setState({ hasError: false, error: null });
      forceLoad();
    }
  };

  // Error boundary effect
  const handleError = (error: Error) => {
    setState({ hasError: true, error });
    if (accessibleName) {
      announce(`Failed to load ${accessibleName}`, 'assertive');
    }
    onError?.(error);
  };

  if (state.hasError) {
    return (
      <div className={`lazy-component lazy-component--error ${className}`} ref={ref as React.RefObject<HTMLDivElement>}>
        <ErrorFallback 
          error={state.error!} 
          onRetry={retryCountRef.current < maxRetries ? handleRetry : undefined}
          accessibleName={accessibleName}
        />
      </div>
    );
  }

  return (
    <div 
      className={`lazy-component ${isLoaded ? 'lazy-component--loaded' : ''} ${className}`}
      ref={ref as React.RefObject<HTMLDivElement>}
    >
      {shouldRender ? (
        <ErrorBoundaryWrapper onError={handleError}>
          <Suspense fallback={fallback || <DefaultSkeleton minHeight={minHeight} />}>
            <Component {...(componentProps as T)} />
          </Suspense>
        </ErrorBoundaryWrapper>
      ) : (
        fallback || <DefaultSkeleton minHeight={minHeight} />
      )}
    </div>
  );
}

/**
 * Simple error boundary wrapper
 */
class ErrorBoundaryWrapper extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default LazyComponent;
