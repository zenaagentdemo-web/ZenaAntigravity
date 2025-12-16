/**
 * Component Factory Utilities
 * Provides consistent patterns for creating components
 */

import React from 'react';

/**
 * Standard props that all components should support
 */
export interface StandardComponentProps {
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for the component */
  'aria-label'?: string;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Props for components that accept children
 */
export interface WithChildrenProps {
  children?: React.ReactNode;
}

/**
 * Props for interactive components
 */
export interface InteractiveProps {
  /** Click handler */
  onClick?: () => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether the component is in a loading state */
  loading?: boolean;
}

/**
 * Props for components with variants
 */
export interface VariantProps<V extends string = string> {
  /** Visual variant of the component */
  variant?: V;
}

/**
 * Props for components with size options
 */
export interface SizeProps<S extends string = 'sm' | 'md' | 'lg'> {
  /** Size of the component */
  size?: S;
}

/**
 * Common button variants
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/**
 * Common card variants
 */
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

/**
 * Common input variants
 */
export type InputVariant = 'default' | 'filled' | 'outlined';

/**
 * Common size options
 */
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Creates a display name for a component
 * @param name - The component name
 * @param namespace - Optional namespace prefix
 */
export function createDisplayName(name: string, namespace?: string): string {
  return namespace ? `${namespace}.${name}` : name;
}

/**
 * Merges refs for components that need to forward refs
 * @param refs - Array of refs to merge
 */
export function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

/**
 * Creates a polymorphic component type
 * Allows components to render as different HTML elements
 */
export type PolymorphicComponentProps<
  E extends React.ElementType,
  P = object
> = P &
  Omit<React.ComponentPropsWithoutRef<E>, keyof P> & {
    as?: E;
  };

/**
 * Default element types for polymorphic components
 */
export const DEFAULT_ELEMENTS = {
  button: 'button',
  container: 'div',
  text: 'span',
  heading: 'h2',
  list: 'ul',
  listItem: 'li',
  link: 'a',
  input: 'input',
  label: 'label',
} as const;

/**
 * Generates a unique ID for form elements
 * @param prefix - Optional prefix for the ID
 */
export function generateId(prefix: string = 'component'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guard to check if a value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Extracts data attributes from props
 * @param props - Component props
 */
export function extractDataAttributes(
  props: Record<string, unknown>
): Record<string, unknown> {
  return Object.entries(props)
    .filter(([key]) => key.startsWith('data-'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

/**
 * Extracts aria attributes from props
 * @param props - Component props
 */
export function extractAriaAttributes(
  props: Record<string, unknown>
): Record<string, unknown> {
  return Object.entries(props)
    .filter(([key]) => key.startsWith('aria-'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}
