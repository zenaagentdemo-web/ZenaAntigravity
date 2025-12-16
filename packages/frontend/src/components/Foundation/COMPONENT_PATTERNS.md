# Component Patterns Guide

This document defines the standard patterns and conventions for creating components in the Zena AI Real Estate PWA.

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [File Organization](#file-organization)
3. [Props Interface Patterns](#props-interface-patterns)
4. [CSS Class Naming](#css-class-naming)
5. [Export Patterns](#export-patterns)
6. [Component Composition](#component-composition)
7. [Accessibility Patterns](#accessibility-patterns)
8. [Design Token Usage](#design-token-usage)

---

## Naming Conventions

### Component Names
- Use **PascalCase** for all component names
- Use descriptive names that indicate the component's purpose
- Use consistent suffixes for component categories:

| Category | Suffix | Examples |
|----------|--------|----------|
| Widgets | `Widget` | `WeatherTimeWidget`, `CalendarWidget` |
| Panels | `Panel` | `QuickActionsPanel`, `PriorityNotificationsPanel` |
| Dialogs | `Dialog` | `CRMDialog`, `ExportDialog` |
| Indicators | `Indicator` | `OfflineIndicator`, `SyncStatusIndicator` |
| Foundation | None | `Button`, `Card`, `Input` |

### File Names
- Component files: `ComponentName.tsx`
- Style files: `ComponentName.css`
- Test files: `ComponentName.test.tsx`
- Property test files: `ComponentName.property.test.ts`

---

## File Organization

### Directory Structure
```
src/components/
├── Foundation/           # Core reusable components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.css
│   │   └── Button.test.tsx
│   ├── Card/
│   ├── Input/
│   ├── Typography/
│   ├── Layout/
│   ├── index.ts          # Barrel export
│   └── COMPONENT_PATTERNS.md
├── LoadingStates/        # Loading-related components
│   ├── LoadingSpinner.tsx
│   ├── ProgressBar.tsx
│   ├── SkeletonLoader.tsx
│   └── index.ts
├── ErrorStates/          # Error-related components
│   ├── ErrorMessage.tsx
│   ├── EmptyState.tsx
│   └── index.ts
└── [FeatureComponent]/   # Feature-specific components
    ├── FeatureComponent.tsx
    ├── FeatureComponent.css
    └── FeatureComponent.test.tsx
```

### Index Files
Every component directory should have an `index.ts` that exports:
- Named exports for components
- Type exports for props interfaces

```typescript
// Example: Foundation/index.ts
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';

export { Card } from './Card/Card';
export type { CardProps } from './Card/Card';
```

---

## Props Interface Patterns

### Standard Props
All components should support these standard props where applicable:

```typescript
interface StandardProps {
  className?: string;      // Custom CSS classes
  children?: React.ReactNode;  // Child content
  'aria-label'?: string;   // Accessibility label
}
```

### Variant Props
Components with visual variations should use:

```typescript
interface VariantProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
```

### Interactive Props
Interactive components should include:

```typescript
interface InteractiveProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}
```

### Complete Example

```typescript
export interface ButtonProps {
  // Variants
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  
  // Content
  children: React.ReactNode;
  
  // Interaction
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  
  // Styling
  className?: string;
  
  // Accessibility
  'aria-label'?: string;
}
```

---

## CSS Class Naming

### BEM-like Convention
Follow a BEM-inspired naming pattern:

- **Base class**: `component-name` (lowercase with hyphens)
- **Modifier**: `component-name--modifier`
- **Element**: `component-name__element`

### Examples

```css
/* Base class */
.btn { }

/* Modifiers */
.btn--primary { }
.btn--secondary { }
.btn--sm { }
.btn--lg { }
.btn--disabled { }

/* Elements */
.btn__icon { }
.btn__label { }
```

### Class Building Pattern

```typescript
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const disabledClass = disabled ? 'btn--disabled' : '';
  
  const classes = [baseClass, variantClass, sizeClass, disabledClass, className]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
};
```

---

## Export Patterns

### Named Exports
Always use named exports for components:

```typescript
// ✅ Good
export const Button: React.FC<ButtonProps> = () => { };

// ❌ Avoid
export default function Button() { }
```

### Type Exports
Export props interfaces alongside components:

```typescript
export interface ButtonProps { }
export const Button: React.FC<ButtonProps> = () => { };
```

### Barrel Exports
Use index files for clean imports:

```typescript
// Foundation/index.ts
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';
```

This enables clean imports:
```typescript
import { Button, Card, Input } from '@/components/Foundation';
```

---

## Component Composition

### Children Pattern
Use children for flexible content:

```typescript
export const Card: React.FC<CardProps> = ({ children, ...props }) => (
  <div className="card" {...props}>
    {children}
  </div>
);
```

### Compound Components
For complex components, use compound pattern:

```typescript
// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### Render Props
For components needing render customization:

```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}
```

---

## Accessibility Patterns

### Required Attributes
- All interactive elements must have accessible names
- Use `aria-label` for icon-only buttons
- Use `aria-describedby` for form field descriptions

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Use proper focus management
- Support standard keyboard shortcuts

### Example

```typescript
export const Button: React.FC<ButtonProps> = ({
  'aria-label': ariaLabel,
  disabled,
  ...props
}) => (
  <button
    aria-label={ariaLabel}
    aria-disabled={disabled}
    tabIndex={disabled ? -1 : 0}
    {...props}
  />
);
```

### Focus Indicators
Use design tokens for consistent focus styles:

```css
.btn:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

---

## Design Token Usage

### Always Use Tokens
Never use hardcoded values for:
- Colors
- Spacing
- Typography
- Shadows
- Border radius
- Transitions

### Token Categories

| Category | Token Prefix | Example |
|----------|--------------|---------|
| Colors | `--color-` | `--color-primary-500` |
| Spacing | `--spacing-` | `--spacing-4` |
| Typography | `--font-` | `--font-size-base` |
| Shadows | `--shadow-` | `--shadow-md` |
| Radius | `--radius-` | `--radius-md` |
| Transitions | `--transition-` | `--transition-base` |

### Example CSS

```css
.btn {
  /* Spacing */
  padding: var(--spacing-2) var(--spacing-4);
  
  /* Typography */
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  
  /* Colors */
  background-color: var(--color-primary-500);
  color: var(--color-white);
  
  /* Shape */
  border-radius: var(--radius-md);
  
  /* Effects */
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.btn:hover {
  background-color: var(--color-primary-600);
  box-shadow: var(--shadow-md);
}
```

---

## Quick Reference

### Creating a New Component

1. Create directory: `src/components/ComponentName/`
2. Create files:
   - `ComponentName.tsx` - Component implementation
   - `ComponentName.css` - Styles using design tokens
   - `ComponentName.test.tsx` - Unit tests (optional)
3. Export from index file
4. Follow naming conventions
5. Use design tokens for all styling
6. Include accessibility attributes

### Checklist

- [ ] PascalCase component name
- [ ] Props interface exported
- [ ] BEM-like CSS classes
- [ ] Design tokens used (no hardcoded values)
- [ ] Accessibility attributes included
- [ ] Exported from index file
- [ ] TypeScript types complete
