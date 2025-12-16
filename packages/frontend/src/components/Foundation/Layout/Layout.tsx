import React from 'react';
import './Layout.css';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export interface ContainerProps extends LayoutProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface FlexProps extends LayoutProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface GridProps extends LayoutProps {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  maxWidth = 'xl',
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'container';
  const maxWidthClass = `container--${maxWidth}`;
  const paddingClass = `container--padding-${padding}`;
  
  const classes = [baseClass, maxWidthClass, paddingClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  justify = 'start',
  align = 'start',
  wrap = 'nowrap',
  gap = 'none',
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'flex';
  const directionClass = `flex--${direction}`;
  const justifyClass = `flex--justify-${justify}`;
  const alignClass = `flex--align-${align}`;
  const wrapClass = `flex--${wrap}`;
  const gapClass = gap !== 'none' ? `flex--gap-${gap}` : '';
  
  const classes = [baseClass, directionClass, justifyClass, alignClass, wrapClass, gapClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export const Grid: React.FC<GridProps> = ({
  cols = 1,
  gap = 'md',
  responsive = true,
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'grid';
  const colsClass = `grid--cols-${cols}`;
  const gapClass = gap !== 'none' ? `grid--gap-${gap}` : '';
  const responsiveClass = responsive ? 'grid--responsive' : '';
  
  const classes = [baseClass, colsClass, gapClass, responsiveClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};