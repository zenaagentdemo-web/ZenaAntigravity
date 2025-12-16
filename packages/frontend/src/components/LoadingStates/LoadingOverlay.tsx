import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ProgressBar } from './ProgressBar';
import './LoadingOverlay.css';

export interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number; // 0-100, if provided shows progress bar
  variant?: 'spinner' | 'progress';
  backdrop?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  progress,
  variant = 'spinner',
  backdrop = true,
  size = 'md',
  className = '',
  onCancel,
  cancelLabel = 'Cancel',
  children
}) => {
  if (!isVisible) return null;

  const showProgress = variant === 'progress' && progress !== undefined;

  return (
    <div 
      className={`loading-overlay ${backdrop ? 'loading-overlay--backdrop' : ''} ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-overlay-message"
    >
      <div className={`loading-overlay__content loading-overlay__content--${size}`}>
        {variant === 'spinner' && (
          <LoadingSpinner 
            size={size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'xl'} 
            aria-label={message}
          />
        )}
        
        {showProgress && (
          <ProgressBar
            progress={progress!}
            size={size}
            showLabel={true}
            animated={true}
            aria-label={message}
          />
        )}
        
        <div 
          id="loading-overlay-message"
          className="loading-overlay__message"
        >
          {message}
        </div>
        
        {children && (
          <div className="loading-overlay__details">
            {children}
          </div>
        )}
        
        {onCancel && (
          <button
            type="button"
            className="loading-overlay__cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
};