/**
 * Foundation Utilities
 * Helper functions and types for consistent component development
 */

// Class name utilities
export {
  classNames,
  createClassBuilder,
  variantClass,
  sizeClass,
  stateClasses,
} from './classNames';

export type { Size, StateOptions } from './classNames';

// Component factory utilities
export {
  createDisplayName,
  mergeRefs,
  generateId,
  isDefined,
  extractDataAttributes,
  extractAriaAttributes,
  DEFAULT_ELEMENTS,
} from './componentFactory';

export type {
  StandardComponentProps,
  WithChildrenProps,
  InteractiveProps,
  VariantProps,
  SizeProps,
  ButtonVariant,
  CardVariant,
  InputVariant,
  ComponentSize,
  PolymorphicComponentProps,
} from './componentFactory';
