import React, { forwardRef } from 'react';
import './Input.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  error = false,
  helperText,
  label,
  required = false,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const helperTextId = helperText ? `${inputId}-helper` : undefined;
  
  const baseClass = 'input';
  const variantClass = `input--${variant}`;
  const sizeClass = `input--${size}`;
  const errorClass = error ? 'input--error' : '';
  
  const classes = [baseClass, variantClass, sizeClass, errorClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required" aria-label="required">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={classes}
        aria-describedby={helperTextId}
        aria-invalid={error}
        {...props}
      />
      {helperText && (
        <div 
          id={helperTextId} 
          className={`input-helper-text ${error ? 'input-helper-text--error' : ''}`}
        >
          {helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';