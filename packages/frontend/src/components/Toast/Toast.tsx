/**
 * Toast Component
 * 
 * Glassmorphism toast notifications for action feedback.
 * Supports success, error, and info variants with auto-dismiss.
 * 
 * Requirements: 4.5, 4.6
 */

import React, { useEffect, useState, useCallback } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

export interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

/**
 * Individual Toast Component
 */
export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(handleDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div 
      className={`toast toast--${toast.type} ${isExiting ? 'toast--exiting' : ''}`}
      role="alert"
      aria-live="polite"
      data-testid={`toast-${toast.type}`}
    >
      <span className="toast__icon">{getIcon()}</span>
      <span className="toast__message">{toast.message}</span>
      {toast.action && (
        <button 
          className="toast__action"
          onClick={toast.action.onClick}
        >
          {toast.action.label}
        </button>
      )}
      <button 
        className="toast__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

/**
 * Toast Container - Renders all active toasts
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default Toast;
