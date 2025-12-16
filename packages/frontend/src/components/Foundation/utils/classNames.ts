/**
 * Utility functions for consistent component class name generation
 * Following BEM-like naming conventions
 */

/**
 * Combines multiple class names into a single string, filtering out falsy values
 * @param classes - Array of class names or falsy values
 * @returns Combined class string
 */
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Creates a class name builder for a component following BEM conventions
 * @param baseClass - The base class name (e.g., 'btn', 'card')
 * @returns Object with methods to build class names
 */
export function createClassBuilder(baseClass: string) {
  return {
    /**
     * Returns the base class
     */
    base: () => baseClass,

    /**
     * Creates a modifier class (e.g., 'btn--primary')
     * @param modifier - The modifier name
     * @param condition - Optional condition to include the modifier
     */
    modifier: (modifier: string, condition: boolean = true): string | undefined => {
      return condition ? `${baseClass}--${modifier}` : undefined;
    },

    /**
     * Creates an element class (e.g., 'btn__icon')
     * @param element - The element name
     */
    element: (element: string): string => {
      return `${baseClass}__${element}`;
    },

    /**
     * Builds the complete class string from base, modifiers, and custom classes
     * @param options - Configuration for class building
     */
    build: (options: {
      modifiers?: Record<string, boolean | undefined>;
      className?: string;
    } = {}): string => {
      const { modifiers = {}, className = '' } = options;
      
      const modifierClasses = Object.entries(modifiers)
        .filter(([, condition]) => condition)
        .map(([modifier]) => `${baseClass}--${modifier}`);

      return classNames(baseClass, ...modifierClasses, className);
    }
  };
}

/**
 * Type-safe variant class generator
 * @param baseClass - The base class name
 * @param variant - The variant value
 * @param validVariants - Array of valid variant values
 * @returns The variant class or undefined if invalid
 */
export function variantClass<T extends string>(
  baseClass: string,
  variant: T | undefined,
  validVariants: readonly T[]
): string | undefined {
  if (variant && validVariants.includes(variant)) {
    return `${baseClass}--${variant}`;
  }
  return undefined;
}

/**
 * Size class generator with standard size options
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function sizeClass(baseClass: string, size: Size = 'md'): string {
  return `${baseClass}--${size}`;
}

/**
 * State class generator for common component states
 */
export interface StateOptions {
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  active?: boolean;
  focused?: boolean;
}

export function stateClasses(baseClass: string, states: StateOptions): string[] {
  const classes: string[] = [];
  
  if (states.disabled) classes.push(`${baseClass}--disabled`);
  if (states.loading) classes.push(`${baseClass}--loading`);
  if (states.error) classes.push(`${baseClass}--error`);
  if (states.active) classes.push(`${baseClass}--active`);
  if (states.focused) classes.push(`${baseClass}--focused`);
  
  return classes;
}

/**
 * Example usage:
 * 
 * const builder = createClassBuilder('btn');
 * 
 * // Simple usage
 * const classes = builder.build({
 *   modifiers: {
 *     primary: variant === 'primary',
 *     sm: size === 'sm',
 *     disabled: disabled
 *   },
 *   className: customClassName
 * });
 * 
 * // Or manual building
 * const classes = classNames(
 *   builder.base(),
 *   builder.modifier('primary', variant === 'primary'),
 *   builder.modifier('disabled', disabled),
 *   customClassName
 * );
 */
