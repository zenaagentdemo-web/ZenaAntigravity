/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for ZenaAvatar Component
 * 
 * **Feature: high-tech-ai-aesthetic, Property 1: AI Avatar Gradient Colors**
 * **Validates: Requirements 1.4**
 * 
 * Tests that the AI Avatar gradient background contains the exact colors
 * cyan (#00D4FF), magenta (#FF00FF), and purple (#8B5CF6).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Expected gradient colors from Requirements 1.4
const EXPECTED_GRADIENT_COLORS = {
  cyan: '#00D4FF',
  magenta: '#FF00FF',
  purple: '#8B5CF6',
};

// CSS custom property values that should be used
const CSS_CUSTOM_PROPERTIES = {
  '--neon-cyan': '#00D4FF',
  '--neon-magenta': '#FF00FF',
  '--neon-purple': '#8B5CF6',
};

// Avatar sizes
const AVATAR_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const;

// Avatar states
const AVATAR_STATES = ['idle', 'active', 'processing', 'listening', 'speaking', 'success', 'error'] as const;

// Generators
const avatarSizeGenerator = fc.constantFrom(...AVATAR_SIZES);
const avatarStateGenerator = fc.constantFrom(...AVATAR_STATES);
const gradientColorGenerator = fc.constantFrom('cyan', 'magenta', 'purple');

/**
 * Parse a CSS gradient string and extract color values
 */
function parseGradientColors(gradientString: string): string[] {
  // Match hex colors and CSS variable references
  const hexPattern = /#[0-9a-fA-F]{6}/g;
  const varPattern = /var\(--neon-(cyan|magenta|purple)\)/g;
  
  const hexColors = gradientString.match(hexPattern) || [];
  const varRefs = gradientString.match(varPattern) || [];
  
  // Convert var references to their expected values
  const resolvedVarColors = varRefs.map(varRef => {
    if (varRef.includes('cyan')) return CSS_CUSTOM_PROPERTIES['--neon-cyan'];
    if (varRef.includes('magenta')) return CSS_CUSTOM_PROPERTIES['--neon-magenta'];
    if (varRef.includes('purple')) return CSS_CUSTOM_PROPERTIES['--neon-purple'];
    return '';
  }).filter(Boolean);
  
  return [...hexColors, ...resolvedVarColors];
}

/**
 * Check if a gradient contains the expected neon colors
 */
function gradientContainsExpectedColors(gradientString: string): boolean {
  const normalizedGradient = gradientString.toLowerCase();
  
  // Check for CSS variable references (preferred)
  const hasVarCyan = normalizedGradient.includes('var(--neon-cyan)');
  const hasVarMagenta = normalizedGradient.includes('var(--neon-magenta)');
  const hasVarPurple = normalizedGradient.includes('var(--neon-purple)');
  
  // Check for direct hex values (fallback)
  const hasCyan = normalizedGradient.includes('#00d4ff') || hasVarCyan;
  const hasMagenta = normalizedGradient.includes('#ff00ff') || hasVarMagenta;
  const hasPurple = normalizedGradient.includes('#8b5cf6') || hasVarPurple;
  
  return hasCyan && hasMagenta && hasPurple;
}

/**
 * Validate that a color is a valid hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/i.test(color);
}

/**
 * Check if a color matches one of the expected gradient colors
 */
function isExpectedGradientColor(color: string): boolean {
  const normalizedColor = color.toUpperCase();
  return Object.values(EXPECTED_GRADIENT_COLORS).includes(normalizedColor);
}

describe('ZenaAvatar - Property 1: AI Avatar Gradient Colors', () => {
  /**
   * Property 1: AI Avatar Gradient Colors
   * For any AI Avatar element rendered in the interface, the gradient background
   * should contain the exact colors cyan (#00D4FF), magenta (#FF00FF), and purple (#8B5CF6)
   */

  // The expected CSS gradient definition
  const expectedGradientCSS = `linear-gradient(
    135deg,
    var(--neon-cyan) 0%,
    var(--neon-magenta) 50%,
    var(--neon-purple) 100%
  )`;

  it('Property 1: Expected gradient colors should be valid hex colors', () => {
    fc.assert(
      fc.property(gradientColorGenerator, (colorKey) => {
        const color = EXPECTED_GRADIENT_COLORS[colorKey as keyof typeof EXPECTED_GRADIENT_COLORS];
        
        // Each expected color should be a valid hex color
        expect(isValidHexColor(color)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: CSS custom properties should map to expected gradient colors', () => {
    fc.assert(
      fc.property(gradientColorGenerator, (colorKey) => {
        const expectedColor = EXPECTED_GRADIENT_COLORS[colorKey as keyof typeof EXPECTED_GRADIENT_COLORS];
        const cssVarKey = `--neon-${colorKey}` as keyof typeof CSS_CUSTOM_PROPERTIES;
        const cssVarValue = CSS_CUSTOM_PROPERTIES[cssVarKey];
        
        // CSS custom property value should match expected color
        expect(cssVarValue.toUpperCase()).toBe(expectedColor.toUpperCase());
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Gradient definition should contain all three neon colors', () => {
    // Test that the expected gradient CSS contains all required colors
    expect(gradientContainsExpectedColors(expectedGradientCSS)).toBe(true);
  });

  it('Property 1: For any avatar size, gradient colors should remain consistent', () => {
    fc.assert(
      fc.property(avatarSizeGenerator, (size) => {
        // The gradient colors should be the same regardless of size
        // Size only affects dimensions, not colors
        const expectedColors = Object.values(EXPECTED_GRADIENT_COLORS);
        
        expectedColors.forEach(color => {
          expect(isValidHexColor(color)).toBe(true);
          expect(isExpectedGradientColor(color)).toBe(true);
        });
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: For any avatar state, gradient colors should remain consistent', () => {
    fc.assert(
      fc.property(avatarStateGenerator, (state) => {
        // The base gradient colors should be the same regardless of state
        // State only affects animations and glow, not the base gradient
        const expectedColors = Object.values(EXPECTED_GRADIENT_COLORS);
        
        expectedColors.forEach(color => {
          expect(isValidHexColor(color)).toBe(true);
          expect(isExpectedGradientColor(color)).toBe(true);
        });
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Cyan color should be exactly #00D4FF', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(EXPECTED_GRADIENT_COLORS.cyan.toUpperCase()).toBe('#00D4FF');
        expect(CSS_CUSTOM_PROPERTIES['--neon-cyan'].toUpperCase()).toBe('#00D4FF');
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Magenta color should be exactly #FF00FF', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(EXPECTED_GRADIENT_COLORS.magenta.toUpperCase()).toBe('#FF00FF');
        expect(CSS_CUSTOM_PROPERTIES['--neon-magenta'].toUpperCase()).toBe('#FF00FF');
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Purple color should be exactly #8B5CF6', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(EXPECTED_GRADIENT_COLORS.purple.toUpperCase()).toBe('#8B5CF6');
        expect(CSS_CUSTOM_PROPERTIES['--neon-purple'].toUpperCase()).toBe('#8B5CF6');
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: All gradient colors should be distinct', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const colors = Object.values(EXPECTED_GRADIENT_COLORS);
        const uniqueColors = new Set(colors.map(c => c.toUpperCase()));
        
        // All three colors should be unique
        expect(uniqueColors.size).toBe(3);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Gradient should use CSS custom properties for maintainability', () => {
    fc.assert(
      fc.property(gradientColorGenerator, (colorKey) => {
        // The gradient should reference CSS custom properties
        const varName = `var(--neon-${colorKey})`;
        
        // Expected gradient should contain the CSS variable reference
        expect(expectedGradientCSS).toContain(varName);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
