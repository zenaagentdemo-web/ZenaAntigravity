import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ProgressBar } from './ProgressBar';
import { SkeletonLoader } from './SkeletonLoader';
import { WidgetSkeleton } from './WidgetSkeleton';
import { ErrorMessage } from '../ErrorStates/ErrorMessage';
import { EmptyState } from '../ErrorStates/EmptyState';
import './LoadingWrapper.css';

export interface LoadingWrapperProps {
  isLoading: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  progress?: number;
  stage?: string;
  loadingVariant?: 'spinner' | 'progress' | 'skeleton' | 'widget-skeleton';
  skeletonVariant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  widgetSkeletonVariant?: 'card' | 'list' | 'chart' | 'header' | 'notification';
  skeletonCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode | string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  onRetry?: () => void;
  onErrorDismiss?: () => void;
  retryLabel?: string;
  className?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string | number;
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  error,
  isEmpty = false,
  progress,
  stage,
  loadingVariant = 'spinner',
  skeletonVariant = 'text',
  widgetSkeletonVariant = 'card',
  skeletonCount = 3,
  emptyTitle = 'No data available',
  emptyDescription = 'There is no data to display at the moment.',
  emptyIcon = '📭',
  emptyAction,
  onRetry,
  onErrorDismiss,
  retryLabel = 'Try Again',
  className = '',
  children,
  fallback,
  minHeight
}) => {
  const containerStyle: React.CSSProperties = {};
  if (minHeight) {
    containerStyle.minHeight = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
  }

  const renderLoadingState = () => {
    if (fallback) {
      return fallback;
    }

    switch (loadingVariant) {
      case 'spinner':
        return (
          <div className="loading-wrapper__spinner-container">
            <LoadingSpinner size="lg" />
            {stage && (
              <div className="loading-wrapper__stage">
                {stage}
              </div>
            )}
          </div>
        );

      case 'progress':
        return (
          <div className="loading-wrapper__progress-container">
            <ProgressBar
              progress={progress || 0}
              showLabel={true}
              label={stage}
              animated={true}
            />
          </div>
        );

      case 'skeleton':
        return (
          <div className="loading-wrapper__skeleton-container">
            <SkeletonLoader
              variant={skeletonVariant}
              lines={skeletonCount}
              animated={true}
            />
          </div>
        );

      case 'widget-skeleton':
        return (
          <WidgetSkeleton
            variant={widgetSkeletonVariant}
            count={skeletonCount}
          />
        );

      default:
        return (
          <div className="loading-wrapper__spinner-container">
            <LoadingSpinner size="lg" />
          </div>
        );
    }
  };

  const renderErrorState = () => (
    <ErrorMessage
      title="Something went wrong"
      message={error?.message || 'An unexpected error occurred'}
      variant="error"
      onRetry={onRetry}
      onDismiss={onErrorDismiss}
      retryLabel={retryLabel}
      className="loading-wrapper__error"
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      icon={emptyIcon}
      action={emptyAction}
      className="loading-wrapper__empty"
    />
  );

  return (
    <div 
      className={`loading-wrapper ${className}`}
      style={containerStyle}
    >
      {error ? (
        renderErrorState()
      ) : isLoading ? (
        renderLoadingState()
      ) : isEmpty ? (
        renderEmptyState()
      ) : (
        <div className="loading-wrapper__content">
          {children}
        </div>
      )}
    </div>
  );
};