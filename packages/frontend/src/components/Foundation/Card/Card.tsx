import React from 'react';
import './Card.css';

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  onClick,
  'aria-label': ariaLabel,
  ...props
}) => {
  const baseClass = 'card';
  const variantClass = `card--${variant}`;
  const paddingClass = `card--padding-${padding}`;
  const interactiveClass = onClick ? 'card--interactive' : '';
  
  const classes = [baseClass, variantClass, paddingClass, interactiveClass, className]
    .filter(Boolean)
    .join(' ');

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Component>
  );
};