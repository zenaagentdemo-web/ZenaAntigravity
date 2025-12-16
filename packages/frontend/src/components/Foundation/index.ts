// Foundation Components - Professional Design System

// Core Components
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';

export { Card } from './Card/Card';
export type { CardProps } from './Card/Card';

export { Input } from './Input/Input';
export type { InputProps } from './Input/Input';

export { Typography } from './Typography/Typography';
export type { TypographyProps } from './Typography/Typography';

export { Container, Flex, Grid } from './Layout/Layout';
export type { ContainerProps, FlexProps, GridProps } from './Layout/Layout';

// Utilities for consistent component development
export {
  // Class name utilities
  classNames,
  createClassBuilder,
  variantClass,
  sizeClass,
  stateClasses,
  // Component factory utilities
  createDisplayName,
  mergeRefs,
  generateId,
  isDefined,
  extractDataAttributes,
  extractAriaAttributes,
  DEFAULT_ELEMENTS,
} from './utils';

export type {
  // Class name types
  Size,
  StateOptions,
  // Component factory types
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
} from './utils';