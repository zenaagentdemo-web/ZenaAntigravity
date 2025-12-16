import React from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode | string;
  illustration?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  illustration,
  action,
  secondaryAction,
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`empty-state empty-state--${size} ${className}`}>
      <div className="empty-state__content">
        {(illustration || icon) && (
          <div className="empty-state__visual">
            {illustration || (
              <div className="empty-state__icon" aria-hidden="true">
                {typeof icon === 'string' ? icon : icon}
              </div>
            )}
          </div>
        )}
        
        <div className="empty-state__text">
          <h2 className="empty-state__title">
            {title}
          </h2>
          {description && (
            <p className="empty-state__description">
              {description}
            </p>
          )}
        </div>
        
        {(action || secondaryAction) && (
          <div className="empty-state__actions">
            {action && (
              <button
                type="button"
                className={`empty-state__button empty-state__button--${action.variant || 'primary'}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                className="empty-state__button empty-state__button--secondary"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};