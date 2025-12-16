/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * **Feature: professional-ui-redesign, Property 11: Design System Architecture**
 * **Validates: Requirements 8.3**
 * 
 * For any style modification through design tokens, the change should propagate 
 * to all components using that token without requiring component-level modifications.
 */

// Read and parse the tokens.css file
let tokensCSS: string = '';

beforeAll(() => {
  const tokensPath = path.resolve(__dirname, './tokens.css');
  tokensCSS = fs.readFileSync(tokensPath, 'utf-8');
});

// Helper to extract CSS custom property definitions from CSS content
function extractTokenDefinitions(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  // Match CSS custom property definitions: --property-name: value;
  const regex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    tokens.set(`--${match[1]}`, match[2].trim());
  }
  return tokens;
}

// Helper to extract :root tokens
function extractRootTokens(css: string): Map<string, string> {
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  if (!rootMatch) return new Map();
  return extractTokenDefinitions(rootMatch[1]);
}

// Helper to extract [data-theme="night"] tokens
function extractDarkThemeTokens(css: string): Map<string, string> {
  const darkMatch = css.match(/\[data-theme="night"\]\s*\{([^}]+)\}/);
  if (!darkMatch) return new Map();
  return extractTokenDefinitions(darkMatch[1]);
}

// Design token categories that should be defined in the system
const REQUIRED_TOKEN_CATEGORIES = {
  colors: [
    '--color-primary',
    '--color-primary-hover',
    '--color-background',
    '--color-surface',
    '--color-text',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-border',
    '--color-success',
    '--color-warning',
    '--color-error',
  ],
  spacing: [
    '--spacing-1',
    '--spacing-2',
    '--spacing-3',
    '--spacing-4',
    '--spacing-6',
    '--spacing-8',
    '--spacing-xs',
    '--spacing-sm',
    '--spacing-md',
    '--spacing-lg',
    '--spacing-xl',
  ],
  typography: [
    '--font-family-sans',
    '--font-family-base',
    '--font-size-xs',
    '--font-size-sm',
    '--font-size-base',
    '--font-size-lg',
    '--font-size-xl',
    '--font-weight-normal',
    '--font-weight-medium',
    '--font-weight-semibold',
    '--font-weight-bold',
  ],
  shadows: [
    '--shadow-sm',
    '--shadow-base',
    '--shadow-md',
    '--shadow-lg',
    '--shadow-xl',
  ],
  transitions: [
    '--transition-fast',
    '--transition-base',
    '--transition-slow',
  ],
  radii: [
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-full',
  ],
};

// Tokens that should be overridden in dark theme
const THEME_SENSITIVE_TOKENS = [
  '--color-background',
  '--color-surface',
  '--color-surface-hover',
  '--color-text',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-border',
  '--color-primary',
  '--color-primary-hover',
];

describe('Design System Architecture Property Tests', () => {
  /**
   * Property 11.1: Token Definition Completeness
   * For any design token category, all required tokens should be defined in :root
   */
  it('should have all required design tokens defined in :root', () => {
    const rootTokens = extractRootTokens(tokensCSS);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(REQUIRED_TOKEN_CATEGORIES)),
        (category) => {
          const requiredTokens = REQUIRED_TOKEN_CATEGORIES[category as keyof typeof REQUIRED_TOKEN_CATEGORIES];
          
          for (const tokenName of requiredTokens) {
            const hasToken = rootTokens.has(tokenName);
            expect(hasToken).toBe(true);
            
            if (hasToken) {
              const value = rootTokens.get(tokenName)!;
              // Token should have a non-empty value
              expect(value.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11.2: Dark Theme Token Override
   * For any theme-sensitive token, the dark theme should provide an override
   */
  it('should have dark theme overrides for theme-sensitive tokens', () => {
    const darkTokens = extractDarkThemeTokens(tokensCSS);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...THEME_SENSITIVE_TOKENS),
        (tokenName) => {
          const hasOverride = darkTokens.has(tokenName);
          expect(hasOverride).toBe(true);
          
          if (hasOverride) {
            const value = darkTokens.get(tokenName)!;
            expect(value.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11.3: Spacing Scale Consistency
   * For any spacing token, the values should follow a consistent rem-based scale
   */
  it('should maintain consistent spacing scale hierarchy', () => {
    const rootTokens = extractRootTokens(tokensCSS);
    
    const spacingTokens = [
      { name: '--spacing-1', expectedRem: 0.25 },
      { name: '--spacing-2', expectedRem: 0.5 },
      { name: '--spacing-3', expectedRem: 0.75 },
      { name: '--spacing-4', expectedRem: 1 },
      { name: '--spacing-6', expectedRem: 1.5 },
      { name: '--spacing-8', expectedRem: 2 },
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: spacingTokens.length - 2 }),
        (index) => {
          const currentToken = spacingTokens[index];
          const nextToken = spacingTokens[index + 1];
          
          const currentValue = rootTokens.get(currentToken.name);
          const nextValue = rootTokens.get(nextToken.name);
          
          expect(currentValue).toBeDefined();
          expect(nextValue).toBeDefined();
          
          // Parse rem values
          const parseRem = (value: string | undefined): number => {
            if (!value) return 0;
            const match = value.match(/^([\d.]+)rem$/);
            return match ? parseFloat(match[1]) : 0;
          };
          
          const currentRem = parseRem(currentValue);
          const nextRem = parseRem(nextValue);
          
          // Spacing should increase as token number increases
          expect(nextRem).toBeGreaterThan(currentRem);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 11.4: Font Size Scale Consistency
   * For any font size token, the values should follow a consistent typographic scale
   */
  it('should maintain consistent font size scale', () => {
    const rootTokens = extractRootTokens(tokensCSS);
    
    const fontSizeTokens = [
      '--font-size-xs',
      '--font-size-sm',
      '--font-size-base',
      '--font-size-lg',
      '--font-size-xl',
      '--font-size-2xl',
      '--font-size-3xl',
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: fontSizeTokens.length - 2 }),
        (index) => {
          const currentToken = fontSizeTokens[index];
          const nextToken = fontSizeTokens[index + 1];
          
          const currentValue = rootTokens.get(currentToken);
          const nextValue = rootTokens.get(nextToken);
          
          expect(currentValue).toBeDefined();
          expect(nextValue).toBeDefined();
          
          // Parse rem values
          const parseRem = (value: string | undefined): number => {
            if (!value) return 0;
            const match = value.match(/^([\d.]+)rem$/);
            return match ? parseFloat(match[1]) : 0;
          };
          
          const currentRem = parseRem(currentValue);
          const nextRem = parseRem(nextValue);
          
          // Font size should increase as scale increases
          expect(nextRem).toBeGreaterThan(currentRem);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 11.5: Shadow Token Definition
   * For any shadow token, it should contain valid CSS shadow syntax
   */
  it('should have valid shadow definitions', () => {
    const rootTokens = extractRootTokens(tokensCSS);
    
    const shadowTokens = [
      '--shadow-sm',
      '--shadow-base',
      '--shadow-md',
      '--shadow-lg',
      '--shadow-xl',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...shadowTokens),
        (tokenName) => {
          const value = rootTokens.get(tokenName);
          
          expect(value).toBeDefined();
          expect(value!.length).toBeGreaterThan(0);
          // Should contain 'rgb' for color definition in shadow
          expect(value).toMatch(/rgb/i);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 11.6: Transition Token Consistency
   * For any transition token, the duration should be valid and follow the scale
   */
  it('should have valid transition definitions', () => {
    const rootTokens = extractRootTokens(tokensCSS);
    
    const transitionTokens = [
      { name: '--transition-fast', maxMs: 200 },
      { name: '--transition-base', maxMs: 300 },
      { name: '--transition-slow', maxMs: 400 },
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: transitionTokens.length - 1 }),
        (index) => {
          const token = transitionTokens[index];
          const value = rootTokens.get(token.name);
          
          expect(value).toBeDefined();
          // Should contain 'ms' for milliseconds
          expect(value).toMatch(/\d+ms/);
          
          // Parse duration
          const match = value!.match(/(\d+)ms/);
          if (match) {
            const duration = parseInt(match[1], 10);
            expect(duration).toBeLessThanOrEqual(token.maxMs);
            expect(duration).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 11.7: Theme Transition Support
   * The CSS should include theme transition styles for smooth theme switching
   */
  it('should include theme transition support', () => {
    // Check for theme-transitioning class
    expect(tokensCSS).toContain('.theme-transitioning');
    // Check for transition properties
    expect(tokensCSS).toMatch(/transition.*background-color/);
    expect(tokensCSS).toMatch(/transition.*color/);
  });

  /**
   * Property 11.8: Reduced Motion Support
   * The CSS should respect prefers-reduced-motion media query
   */
  it('should include reduced motion support', () => {
    expect(tokensCSS).toContain('prefers-reduced-motion');
    // Should disable or reduce animations when reduced motion is preferred
    expect(tokensCSS).toMatch(/animation-duration.*0/);
  });

  /**
   * Property 11.9: High Contrast Support
   * The CSS should include high contrast mode support
   */
  it('should include high contrast mode support', () => {
    expect(tokensCSS).toContain('prefers-contrast: high');
  });

  /**
   * Property 11.10: Token Naming Convention
   * All tokens should follow consistent naming convention (kebab-case with category prefix)
   */
  it('should follow consistent token naming convention', () => {
    const rootTokens = extractRootTokens(tokensCSS);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...Array.from(rootTokens.keys())),
        (tokenName) => {
          // Should start with --
          expect(tokenName.startsWith('--')).toBe(true);
          // Should be kebab-case (lowercase with hyphens)
          expect(tokenName).toMatch(/^--[a-z0-9-]+$/);
          // Should have a category prefix (color-, spacing-, font-, etc.)
          const hasValidPrefix = [
            'color-', 'spacing-', 'font-', 'shadow-', 'radius-', 
            'transition-', 'z-index-', 'ease-', 'duration-', 
            'line-height-', 'border-', 'max-width-', 'header-',
            'bottom-nav-', 'touch-target-', 'focus-ring-', 'sr-only-'
          ].some(prefix => tokenName.startsWith(`--${prefix}`));
          expect(hasValidPrefix).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.11: Color Token Completeness for Both Themes
   * For any semantic color token defined in light mode, dark mode should have a corresponding override
   */
  it('should have matching semantic color tokens in both themes', () => {
    const rootTokens = extractRootTokens(tokensCSS);
    const darkTokens = extractDarkThemeTokens(tokensCSS);
    
    // Semantic colors that should exist in both themes
    const semanticColors = [
      '--color-success',
      '--color-warning', 
      '--color-error',
      '--color-info',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...semanticColors),
        (tokenName) => {
          // Should exist in root
          expect(rootTokens.has(tokenName)).toBe(true);
          // Should have dark mode override
          expect(darkTokens.has(tokenName)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
});
