import React from 'react';
import './Typography.css';

export interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption' | 'overline';
  component?: keyof JSX.IntrinsicElements;
  color?: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'success' | 'warning' | 'error';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
  className?: string;
}

const variantMapping = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
} as const;

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  component,
  color = 'primary',
  align = 'left',
  weight,
  children,
  className = '',
  ...props
}) => {
  const Component = component || variantMapping[variant];
  
  const baseClass = 'typography';
  const variantClass = `typography--${variant}`;
  const colorClass = `typography--color-${color}`;
  const alignClass = `typography--align-${align}`;
  const weightClass = weight ? `typography--weight-${weight}` : '';
  
  const classes = [baseClass, variantClass, colorClass, alignClass, weightClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};