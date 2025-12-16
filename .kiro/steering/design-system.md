---
inclusion: always
---

# Zena AI Real Estate PWA - Design System Rules

This document defines the design system rules for integrating Figma designs into the Zena codebase using the Figma MCP.

## Project Overview

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Plain CSS (no CSS-in-JS or utility framework currently)
- **PWA**: Vite PWA plugin for progressive web app capabilities

## Design System Structure

### 1. Token Definitions

**Current State**: No formal design token system is implemented yet.

**Recommendation**: When extracting designs from Figma:
- Create a `src/styles/tokens.css` file for CSS custom properties
- Define colors, spacing, typography, and other design tokens as CSS variables
- Example structure:
```css
:root {
  /* Colors */
  --color-primary: #...;
  --color-secondary: #...;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
  --font-size-base: 16px;
}
```

### 2. Component Library

**Location**: `packages/frontend/src/components/`

**Current State**: Component directory exists but is empty (only .gitkeep)

**Architecture Guidelines**:
- Each component should have its own directory
- Component structure: `ComponentName/ComponentName.tsx`, `ComponentName.css`
- Use TypeScript interfaces for props
- Example:
```
src/components/
  Button/
    Button.tsx
    Button.css
  Card/
    Card.tsx
    Card.css
```

### 3. Frameworks & Libraries

**UI Framework**: React 18.2.0
- Use functional components with hooks
- Prefer TypeScript for type safety

**Styling**: Plain CSS
- No Tailwind, Styled Components, or CSS Modules currently
- Use standard CSS files imported into components
- Class naming convention: BEM or component-scoped naming

**Build System**: Vite 4.4.5
- Fast HMR for development
- Path alias configured: `@/` maps to `src/`

### 4. Asset Management

**Location**: `packages/frontend/public/` (for static assets)

**PWA Assets**: 
- Icons: `pwa-192x192.png`, `pwa-512x512.png`
- Favicon: `favicon.ico`
- Apple touch icon: `apple-touch-icon.png`

**Guidelines**:
- Store images in `public/images/`
- Reference assets using absolute paths from public: `/images/logo.png`
- Optimize images before committing

### 5. Icon System

**Current State**: No icon system implemented

**Recommendation**:
- Use React icon library (e.g., `react-icons` or `lucide-react`)
- Or create `src/components/icons/` for custom SVG icons
- Wrap icons in a consistent Icon component for sizing/coloring

### 6. Styling Approach

**Methodology**: Plain CSS with component-scoped files

**Global Styles**: `src/index.css`
- CSS reset applied
- Base font family: System font stack
- Box-sizing: border-box globally

**Component Styles**:
- Create separate `.css` file for each component
- Import CSS in component file
- Use descriptive class names

**Responsive Design**:
- Use CSS media queries
- Mobile-first approach recommended
- PWA optimized for mobile devices

### 7. Project Structure

```
packages/frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── models/         # TypeScript interfaces/types
│   ├── services/       # API and business logic
│   ├── utils/          # Helper functions
│   ├── test/           # Test utilities
│   ├── App.tsx         # Root component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
└── vite.config.ts      # Build configuration
```

## Figma Integration Guidelines

When using Figma MCP to generate code:

1. **Code Transformation**:
   - Figma MCP outputs React + Tailwind by default
   - Convert Tailwind classes to plain CSS in component-specific files
   - Extract repeated values into CSS custom properties

2. **Component Reuse**:
   - Check `src/components/` for existing components before creating new ones
   - Extend existing components rather than duplicating

3. **Design Tokens**:
   - Extract colors, spacing, typography from Figma
   - Define as CSS custom properties in `src/styles/tokens.css`
   - Reference tokens in component styles

4. **Visual Parity**:
   - Strive for 1:1 match with Figma designs
   - Use Figma's screenshot tool to validate implementation
   - Adjust spacing/sizing minimally to match design

5. **TypeScript**:
   - All components must have proper TypeScript types
   - Define prop interfaces
   - Use strict type checking

6. **Routing**:
   - Use React Router v6 patterns
   - Respect existing routing structure
   - Use `<Link>` for navigation, not `<a>` tags

## Example Component Pattern

```typescript
// src/components/Button/Button.tsx
import './Button.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  onClick 
}) => {
  return (
    <button className={`button button--${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

```css
/* src/components/Button/Button.css */
.button {
  padding: var(--spacing-md);
  border: none;
  border-radius: 4px;
  font-family: var(--font-family-base);
  cursor: pointer;
}

.button--primary {
  background-color: var(--color-primary);
  color: white;
}

.button--secondary {
  background-color: var(--color-secondary);
  color: var(--color-text);
}
```
