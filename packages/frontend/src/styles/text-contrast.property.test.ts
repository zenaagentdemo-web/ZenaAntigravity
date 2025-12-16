/**
 * @vitest-environment jsdom
 */
/**
 * **Feature: high-tech-ai-aesthetic, Property 5: Text Contrast Compliance**
 * **Validates: Requirements 2.4**
 * 
 * Property-based tests for text contrast compliance in the high-tech dark theme.
 * Ensures all text meets WCAG 2.1 AA contrast requirements on dark backgrounds.
 * 
 * Property 5: Text Contrast Compliance
 * *For any* text element displayed on dark backgrounds, the color should be 
 * white (#FFFFFF) or light gray (rgba(255,255,255,0.7) or higher) to ensure readability
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CSS File Reading Utilities
// ============================================================================

const getHighTechAccessibilityCSS = (): string => {
  try {
    const cssPath = path.resolve(__dirname, 'high-tech-accessibility.css');
    return fs.readFileSync(cssPath, 'utf-8');
  } catch {
    return '';
  }
};

// Note: getHighTechThemeCSS is available if needed for future tests
// const getHighTechThemeCSS = (): string => {
//   try {
//     const cssPath = path.resolve(__dirname, 'high-tech-theme.css');
//     return fs.readFileSync(cssPath, 'utf-8');
//   } catch {
//     return '';
//   }
// };

// ============================================================================
// Color Parsing and Contrast Calculation Utilities
// ============================================================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface RGBA extends RGB {
  a: number;
}

// Note: hexToRgb and parseRgba are available for future CSS parsing tests
// const hexToRgb = (hex: string): RGB | null => {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   return result
//     ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
//     : null;
// };
// const parseRgba = (rgba: string): RGBA | null => {
//   const match = rgba.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
//   if (match) {
//     return { r: parseInt(match[1], 10), g: parseInt(match[2], 10), b: parseInt(match[3], 10), a: match[4] ? parseFloat(match[4]) : 1 };
//   }
//   return null;
// };

/**
 * Calculates relative luminance of a color (WCAG formula)
 */
const calculateLuminance = (color: RGB): number => {
  const { r, g, b } = color;
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculates contrast ratio between two colors
 */
const calculateContrastRatio = (color1: RGB, color2: RGB): number => {
  const lum1 = calculateLuminance(color1);
  const lum2 = calculateLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Checks if a color combination meets WCAG AA standards
 * Normal text: 4.5:1 ratio
 * Large text (18px+ or 14px+ bold): 3:1 ratio
 */
const meetsWCAGAA = (
  foreground: RGB,
  background: RGB,
  isLargeText = false
): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Blends a semi-transparent color with a background
 */
const blendColors = (foreground: RGBA, background: RGB): RGB => {
  const alpha = foreground.a;
  return {
    r: Math.round(foreground.r * alpha + background.r * (1 - alpha)),
    g: Math.round(foreground.g * alpha + background.g * (1 - alpha)),
    b: Math.round(foreground.b * alpha + background.b * (1 - alpha)),
  };
};

// ============================================================================
// High-Tech Theme Color Definitions
// ============================================================================

// Dark background colors from high-tech theme
const DARK_BACKGROUNDS: RGB[] = [
  { r: 10, g: 10, b: 15 },    // --bg-primary: #0A0A0F
  { r: 18, g: 18, b: 26 },    // --bg-secondary: #12121A
  { r: 26, g: 26, b: 46 },    // --bg-tertiary: #1A1A2E
];

// Text colors from high-tech theme
const TEXT_COLORS: { name: string; color: RGBA }[] = [
  { name: '--ht-text-primary', color: { r: 255, g: 255, b: 255, a: 1 } },
  { name: '--ht-text-secondary', color: { r: 255, g: 255, b: 255, a: 0.85 } },
  { name: '--ht-text-tertiary', color: { r: 255, g: 255, b: 255, a: 0.7 } },
  { name: '--ht-text-muted', color: { r: 255, g: 255, b: 255, a: 0.6 } },
  { name: '--ht-text-disabled', color: { r: 255, g: 255, b: 255, a: 0.45 } },
];

// Neon accent colors (used for links and interactive elements)
const NEON_COLORS: { name: string; color: RGB }[] = [
  { name: '--neon-cyan', color: { r: 0, g: 212, b: 255 } },
  { name: '--neon-magenta', color: { r: 255, g: 0, b: 255 } },
  { name: '--neon-purple', color: { r: 139, g: 92, b: 246 } },
  { name: '--neon-green', color: { r: 0, g: 255, b: 136 } },
];

// ============================================================================
// Test Data Generators
// ============================================================================

// Generator for dark background colors
const darkBackgroundArbitrary = fc.constantFrom(...DARK_BACKGROUNDS);

// Note: textColorArbitrary available for future tests
// const textColorArbitrary = fc.constantFrom(...TEXT_COLORS);

// Generator for neon accent colors
const neonColorArbitrary = fc.constantFrom(...NEON_COLORS);

// Generator for font sizes (to determine large text threshold)
const fontSizeArbitrary = fc.integer({ min: 12, max: 72 });

// Generator for font weights
const fontWeightArbitrary = fc.constantFrom(100, 200, 300, 400, 500, 600, 700, 800, 900);

// Generator for alpha values (for semi-transparent text)
const alphaArbitrary = fc.double({ min: 0.45, max: 1, noNaN: true });

// ============================================================================
// Property Tests
// ============================================================================

describe('High-Tech AI Aesthetic - Text Contrast Compliance', () => {
  /**
   * Property 5: Text Contrast Compliance
   * For any text element displayed on dark backgrounds, the color should be 
   * white (#FFFFFF) or light gray (rgba(255,255,255,0.7) or higher) to ensure readability
   */
  describe('Property 5: Text Contrast Compliance', () => {
    it('should ensure primary text (#FFFFFF) meets WCAG AA on all dark backgrounds', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          (background) => {
            const primaryText: RGB = { r: 255, g: 255, b: 255 };
            const contrastRatio = calculateContrastRatio(primaryText, background);
            
            // White text on dark backgrounds should have very high contrast
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
            expect(meetsWCAGAA(primaryText, background, false)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure secondary text (rgba 0.85) meets WCAG AA on all dark backgrounds', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          (background) => {
            const secondaryText: RGBA = { r: 255, g: 255, b: 255, a: 0.85 };
            const blendedColor = blendColors(secondaryText, background);
            const contrastRatio = calculateContrastRatio(blendedColor, background);
            
            // Secondary text should meet AA standard
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
            expect(meetsWCAGAA(blendedColor, background, false)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure tertiary text (rgba 0.7) meets WCAG AA on all dark backgrounds', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          (background) => {
            const tertiaryText: RGBA = { r: 255, g: 255, b: 255, a: 0.7 };
            const blendedColor = blendColors(tertiaryText, background);
            const contrastRatio = calculateContrastRatio(blendedColor, background);
            
            // Tertiary text should meet AA standard
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
            expect(meetsWCAGAA(blendedColor, background, false)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure muted text (rgba 0.6) meets WCAG AA for normal text', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          (background) => {
            const mutedText: RGBA = { r: 255, g: 255, b: 255, a: 0.6 };
            const blendedColor = blendColors(mutedText, background);
            const contrastRatio = calculateContrastRatio(blendedColor, background);
            
            // Muted text should meet minimum AA standard (4.5:1)
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
            expect(meetsWCAGAA(blendedColor, background, false)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure disabled text (rgba 0.45) meets WCAG AA for UI components (3:1)', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          (background) => {
            const disabledText: RGBA = { r: 255, g: 255, b: 255, a: 0.45 };
            const blendedColor = blendColors(disabledText, background);
            const contrastRatio = calculateContrastRatio(blendedColor, background);
            
            // Disabled text should meet minimum UI component contrast (3:1)
            // This is the WCAG requirement for non-text UI components
            expect(contrastRatio).toBeGreaterThanOrEqual(3);
            expect(meetsWCAGAA(blendedColor, background, true)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure neon accent colors meet WCAG AA on dark backgrounds', () => {
      fc.assert(
        fc.property(
          neonColorArbitrary,
          darkBackgroundArbitrary,
          (neonColor, background) => {
            const contrastRatio = calculateContrastRatio(neonColor.color, background);
            
            // Neon colors should meet at least 3:1 for UI components
            // Most neon colors will exceed this significantly
            expect(contrastRatio).toBeGreaterThanOrEqual(3);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure large text (18px+) meets reduced contrast requirement (3:1)', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          fontSizeArbitrary.filter(size => size >= 18),
          (background, _fontSize) => {
            // For large text, we can use slightly lower contrast
            const largeTextColor: RGBA = { r: 255, g: 255, b: 255, a: 0.5 };
            const blendedColor = blendColors(largeTextColor, background);
            const contrastRatio = calculateContrastRatio(blendedColor, background);
            
            // Large text only needs 3:1 ratio
            expect(contrastRatio).toBeGreaterThanOrEqual(3);
            expect(meetsWCAGAA(blendedColor, background, true)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure bold text (14px+ with weight 700+) meets large text requirements', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          fontSizeArbitrary.filter(size => size >= 14),
          fontWeightArbitrary.filter(weight => weight >= 700),
          (background, _fontSize, _fontWeight) => {
            // Bold text at 14px+ is considered large text
            const boldTextColor: RGBA = { r: 255, g: 255, b: 255, a: 0.5 };
            const blendedColor = blendColors(boldTextColor, background);
            const contrastRatio = calculateContrastRatio(blendedColor, background);
            
            // Large text only needs 3:1 ratio
            expect(contrastRatio).toBeGreaterThanOrEqual(3);
            expect(meetsWCAGAA(blendedColor, background, true)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure any white text with alpha >= 0.6 meets WCAG AA', () => {
      fc.assert(
        fc.property(
          darkBackgroundArbitrary,
          alphaArbitrary.filter(a => a >= 0.6),
          (background, alpha) => {
            const textColor: RGBA = { r: 255, g: 255, b: 255, a: alpha };
            const blendedColor = blendColors(textColor, background);
            const contrastRatio = calculateContrastRatio(blendedColor, background);
            
            // Any white text with alpha >= 0.6 should meet AA
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CSS File Validation', () => {
    it('should define text color variables in high-tech accessibility CSS', () => {
      const css = getHighTechAccessibilityCSS();
      
      // Check that required text color variables are defined
      expect(css).toContain('--ht-text-primary');
      expect(css).toContain('--ht-text-secondary');
      expect(css).toContain('--ht-text-tertiary');
      expect(css).toContain('--ht-text-muted');
    });

    it('should define heading glow effects in high-tech accessibility CSS', () => {
      const css = getHighTechAccessibilityCSS();
      
      // Check that heading glow effects are defined
      expect(css).toContain('text-shadow');
      expect(css).toContain('[data-theme="high-tech"] h1');
      expect(css).toContain('[data-theme="high-tech"] h2');
    });

    it('should define reduced motion support in high-tech accessibility CSS', () => {
      const css = getHighTechAccessibilityCSS();
      
      // Check that reduced motion media query is present
      expect(css).toContain('prefers-reduced-motion');
      expect(css).toContain('animation-duration: 0.01ms');
    });

    it('should define high contrast mode support', () => {
      const css = getHighTechAccessibilityCSS();
      
      // Check that high contrast mode is supported
      expect(css).toContain('prefers-contrast: high');
    });

    it('should define focus indicators for high-tech theme', () => {
      const css = getHighTechAccessibilityCSS();
      
      // Check that focus indicators are defined
      expect(css).toContain('focus-visible');
      expect(css).toContain('outline');
    });
  });

  describe('Contrast Ratio Calculations', () => {
    it('should correctly calculate luminance for any RGB color', () => {
      fc.assert(
        fc.property(
          fc.record({
            r: fc.integer({ min: 0, max: 255 }),
            g: fc.integer({ min: 0, max: 255 }),
            b: fc.integer({ min: 0, max: 255 }),
          }),
          (color) => {
            const luminance = calculateLuminance(color);
            
            // Luminance should be between 0 and 1
            expect(luminance).toBeGreaterThanOrEqual(0);
            expect(luminance).toBeLessThanOrEqual(1);
            
            // Black should have luminance 0
            if (color.r === 0 && color.g === 0 && color.b === 0) {
              expect(luminance).toBe(0);
            }
            
            // White should have luminance 1
            if (color.r === 255 && color.g === 255 && color.b === 255) {
              expect(luminance).toBeCloseTo(1, 5);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly calculate contrast ratio between any two colors', () => {
      fc.assert(
        fc.property(
          fc.record({
            r: fc.integer({ min: 0, max: 255 }),
            g: fc.integer({ min: 0, max: 255 }),
            b: fc.integer({ min: 0, max: 255 }),
          }),
          fc.record({
            r: fc.integer({ min: 0, max: 255 }),
            g: fc.integer({ min: 0, max: 255 }),
            b: fc.integer({ min: 0, max: 255 }),
          }),
          (color1, color2) => {
            const ratio = calculateContrastRatio(color1, color2);
            
            // Contrast ratio should be between 1 and 21
            expect(ratio).toBeGreaterThanOrEqual(1);
            expect(ratio).toBeLessThanOrEqual(21);
            
            // Same colors should have ratio of 1
            if (color1.r === color2.r && color1.g === color2.g && color1.b === color2.b) {
              expect(ratio).toBe(1);
            }
            
            // Black and white should have maximum contrast
            const black = { r: 0, g: 0, b: 0 };
            const white = { r: 255, g: 255, b: 255 };
            const maxRatio = calculateContrastRatio(black, white);
            expect(maxRatio).toBeCloseTo(21, 0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly blend semi-transparent colors with backgrounds', () => {
      fc.assert(
        fc.property(
          fc.record({
            r: fc.integer({ min: 0, max: 255 }),
            g: fc.integer({ min: 0, max: 255 }),
            b: fc.integer({ min: 0, max: 255 }),
            a: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          fc.record({
            r: fc.integer({ min: 0, max: 255 }),
            g: fc.integer({ min: 0, max: 255 }),
            b: fc.integer({ min: 0, max: 255 }),
          }),
          (foreground, background) => {
            const blended = blendColors(foreground, background);
            
            // Blended color should have valid RGB values
            expect(blended.r).toBeGreaterThanOrEqual(0);
            expect(blended.r).toBeLessThanOrEqual(255);
            expect(blended.g).toBeGreaterThanOrEqual(0);
            expect(blended.g).toBeLessThanOrEqual(255);
            expect(blended.b).toBeGreaterThanOrEqual(0);
            expect(blended.b).toBeLessThanOrEqual(255);
            
            // Fully opaque foreground should equal foreground
            if (foreground.a === 1) {
              expect(blended.r).toBe(foreground.r);
              expect(blended.g).toBe(foreground.g);
              expect(blended.b).toBe(foreground.b);
            }
            
            // Fully transparent foreground should equal background
            if (foreground.a === 0) {
              expect(blended.r).toBe(background.r);
              expect(blended.g).toBe(background.g);
              expect(blended.b).toBe(background.b);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
