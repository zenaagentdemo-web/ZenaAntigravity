import React from 'react';
import './ErrorMessage.css';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  dismissLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  variant = 'error',
  size = 'md',
  showIcon = true,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  dismissLabel = 'Dismiss',
  className = '',
  children
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  return (
    <div 
      className={`error-message error-message--${variant} error-message--${size} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="error-message__content">
        {showIcon && (
          <div className="error-message__icon" aria-hidden="true">
            {getIcon()}
          </div>
        )}
        
        <div className="error-message__text">
          {title && (
            <h3 className="error-message__title">
              {title}
            </h3>
          )}
          <p className="error-message__message">
            {message}
          </p>
          {children && (
            <div className="error-message__details">
              {children}
            </div>
          )}
        </div>
      </div>
      
      {(onRetry || onDismiss) && (
        <div className="error-message__actions">
          {onRetry && (
            <button
              type="button"
              className="error-message__button error-message__button--primary"
              onClick={onRetry}
            >
              {retryLabel}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              className="error-message__button error-message__button--secondary"
              onClick={onDismiss}
              aria-label={dismissLabel}
            >
              {dismissLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};